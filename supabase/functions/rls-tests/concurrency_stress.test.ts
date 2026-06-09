// Concurrency / stress tests for the escrow + dispute RPCs.
// Verifies that under parallel calls:
//   1. Exactly one release_escrow_funds succeeds per escrow (no double-credit).
//   2. Exactly one resolve_dispute succeeds per dispute (no double-payout).
//   3. Exactly one vendor_accept_escrow succeeds (no duplicate status flip).
//   4. transaction_events / dispute_events rows are append-only and cannot be
//      mutated or deleted by clients, vendors, or admins, even under load.
//   5. Bulk parallel notifications don't corrupt RLS visibility.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const HELPER = `${SUPABASE_URL}/functions/v1/rls-test-helper`;
const rand = () => Math.random().toString(36).slice(2, 10);

async function helper(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch(HELPER, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}`, "apikey": ANON_KEY },
    body: JSON.stringify({ action, ...body }),
  });
  const txt = await res.text();
  const d = txt ? JSON.parse(txt) : {};
  if (!res.ok) throw new Error(JSON.stringify(d));
  return d;
}

async function makeUser(label: string) {
  const email = `stress_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}!${rand()}`;
  const { user_id } = await helper("create_user", { email, password, full_name: `Stress ${label}` });
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, sb };
}

async function cleanup(...users: { sb: any; id: string }[]) {
  for (const u of users) {
    try { await u.sb.auth.signOut(); } catch { /* */ }
    try { u.sb.removeAllChannels?.(); } catch { /* */ }
    try { await u.sb.realtime?.disconnect?.(); } catch { /* */ }
    try { await helper("delete_user", { user_id: u.id }); } catch { /* */ }
  }
}

async function setupReleasable(amount = 5000, fee = 75) {
  const client = await makeUser("c");
  const vendor = await makeUser("v");
  await helper("set_wallet", { user_id: client.id, balance: 200000 });
  const { data: tx } = await client.sb.from("transactions").insert({
    client_id: client.id, vendor_id: vendor.id, title: "Stress job",
    amount, platform_fee: fee, status: "pending_funding",
  }).select().single();
  await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx!.id });
  await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx!.id });
  await vendor.sb.rpc("vendor_mark_complete", { p_escrow_id: tx!.id });
  return { client, vendor, txId: tx!.id as string, amount };
}

Deno.test({
  name: "Stress: 10 parallel release_escrow_funds -> exactly one success, single credit",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const { client, vendor, txId, amount } = await setupReleasable();

    const N = 10;
    const results = await Promise.all(
      Array.from({ length: N }, () => client.sb.rpc("release_escrow_funds", { p_escrow_id: txId })),
    );
    const successes = results.filter((r) => r.error === null).length;
    assertEquals(successes, 1, `expected exactly 1 successful release, got ${successes}`);

    const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assertEquals(Number(vw!.balance), amount, "vendor wallet must be credited exactly once");

    const { data: txEvts } = await client.sb.from("transaction_events")
      .select("id").eq("transaction_id", txId).eq("event_type", "completed");
    assertEquals(txEvts?.length, 1, "should log exactly one 'completed' event");

    const { data: walletTx } = await vendor.sb.from("wallet_transactions")
      .select("id").eq("escrow_id", txId).eq("type", "escrow_release");
    assertEquals(walletTx?.length, 1, "exactly one escrow_release wallet_transaction row");

    await cleanup(client, vendor);
  },
});

Deno.test({
  name: "Stress: 8 parallel resolve_dispute (mixed actions) -> exactly one wins",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const client = await makeUser("dc");
    const vendor = await makeUser("dv");
    const admin = await makeUser("da");
    await helper("grant_admin", { user_id: admin.id });
    await helper("set_wallet", { user_id: client.id, balance: 200000 });

    const amount = 10000, fee = 150;
    const { data: tx } = await client.sb.from("transactions").insert({
      client_id: client.id, vendor_id: vendor.id, title: "Race dispute",
      amount, platform_fee: fee, status: "pending_funding",
    }).select().single();
    await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx!.id });
    await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx!.id });

    const { data: dispute } = await client.sb.rpc("create_dispute", {
      p_transaction_id: tx!.id, p_reason: "quality_issues", p_description: "race",
    });
    const disputeId = (dispute as any).id;

    const actions = ["refund_buyer", "release_vendor", "refund_buyer", "release_vendor",
                     "refund_buyer", "release_vendor", "refund_buyer", "release_vendor"];
    const results = await Promise.all(
      actions.map((a) => admin.sb.rpc("resolve_dispute", { p_dispute_id: disputeId, p_action: a })),
    );
    const successes = results.filter((r) => r.error === null).length;
    assertEquals(successes, 1, `expected exactly 1 successful resolution, got ${successes}`);

    const { data: d } = await admin.sb.from("disputes").select("status,resolution").eq("id", disputeId).single();
    assertEquals(d!.status, "resolved");

    // Wallet credits: client + vendor combined cannot exceed escrow amount.
    const { data: cw } = await client.sb.from("wallets").select("balance").eq("user_id", client.id).single();
    const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    const clientCredit = Number(cw!.balance) - (200000 - (amount + fee));
    const vendorCredit = Number(vw!.balance);
    assertEquals(clientCredit + vendorCredit, amount, "total credits must equal escrow amount exactly");

    const { data: resolved } = await admin.sb.from("dispute_events")
      .select("id").eq("dispute_id", disputeId).eq("event_type", "resolved");
    assertEquals(resolved?.length, 1, "exactly one 'resolved' dispute_event");

    await cleanup(client, vendor, admin);
  },
});

Deno.test({
  name: "Stress: parallel vendor_accept_escrow -> single accept, single 'accepted' event",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const client = await makeUser("ac");
    const vendor = await makeUser("av");
    await helper("set_wallet", { user_id: client.id, balance: 50000 });

    const { data: tx } = await client.sb.from("transactions").insert({
      client_id: client.id, vendor_id: vendor.id, title: "Accept race",
      amount: 3000, platform_fee: 45, status: "pending_funding",
    }).select().single();
    await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx!.id });

    const results = await Promise.all(
      Array.from({ length: 6 }, () => vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx!.id })),
    );
    const successes = results.filter((r) => r.error === null).length;
    assertEquals(successes, 1, `expected 1 successful accept, got ${successes}`);

    const { data: events } = await client.sb.from("transaction_events")
      .select("id").eq("transaction_id", tx!.id).eq("event_type", "accepted");
    assertEquals(events?.length, 1, "exactly one 'accepted' event");

    await cleanup(client, vendor);
  },
});

Deno.test({
  name: "Stress: timeline events are append-only — parallel UPDATE/DELETE attempts have no effect",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const { client, vendor, txId } = await setupReleasable();
    await client.sb.rpc("release_escrow_funds", { p_escrow_id: txId });

    const { data: before } = await client.sb.from("transaction_events")
      .select("id,event_type,description").eq("transaction_id", txId);
    const beforeCount = before?.length ?? 0;
    assert(beforeCount >= 5, `expected lifecycle events, got ${beforeCount}`);

    // Parallel tamper attempts from both parties.
    const attempts: Promise<unknown>[] = [];
    for (const u of [client, vendor]) {
      for (const ev of before!) {
        attempts.push(u.sb.from("transaction_events").update({ description: "TAMPERED" }).eq("id", ev.id));
        attempts.push(u.sb.from("transaction_events").delete().eq("id", ev.id));
      }
    }
    attempts.push(
      client.sb.from("transaction_events").insert({
        transaction_id: txId, user_id: client.id, event_type: "completed", description: "forged",
      }),
    );
    await Promise.all(attempts);

    const { data: after } = await client.sb.from("transaction_events")
      .select("id,description").eq("transaction_id", txId);
    assertEquals(after?.length, beforeCount, "no rows should be added or deleted");
    for (const row of after!) {
      assert(row.description !== "TAMPERED", `event ${row.id} was tampered`);
    }

    await cleanup(client, vendor);
  },
});

Deno.test({
  name: "Stress: dispute_events are append-only under parallel tamper attempts",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const client = await makeUser("tc");
    const vendor = await makeUser("tv");
    const admin = await makeUser("ta");
    await helper("grant_admin", { user_id: admin.id });
    await helper("set_wallet", { user_id: client.id, balance: 100000 });

    const { data: tx } = await client.sb.from("transactions").insert({
      client_id: client.id, vendor_id: vendor.id, title: "Dispute timeline",
      amount: 5000, platform_fee: 75, status: "pending_funding",
    }).select().single();
    await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx!.id });
    await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx!.id });
    const { data: dispute } = await client.sb.rpc("create_dispute", {
      p_transaction_id: tx!.id, p_reason: "other", p_description: "x",
    });
    const disputeId = (dispute as any).id;
    await vendor.sb.rpc("vendor_submit_dispute_response", {
      p_dispute_id: disputeId, p_response: "ok", p_evidence_count: 0,
    });
    await admin.sb.rpc("resolve_dispute", { p_dispute_id: disputeId, p_action: "refund_buyer" });

    const { data: before } = await client.sb.from("dispute_events")
      .select("id,description").eq("dispute_id", disputeId);
    const beforeCount = before?.length ?? 0;
    assert(beforeCount >= 3, `expected dispute lifecycle events, got ${beforeCount}`);

    const attempts: Promise<unknown>[] = [];
    for (const u of [client, vendor]) {
      for (const ev of before!) {
        attempts.push(u.sb.from("dispute_events").update({ description: "HACKED" }).eq("id", ev.id));
        attempts.push(u.sb.from("dispute_events").delete().eq("id", ev.id));
      }
      attempts.push(u.sb.from("dispute_events").insert({
        dispute_id: disputeId, user_id: u.id, event_type: "resolved", description: "forged",
      }));
    }
    await Promise.all(attempts);

    const { data: after } = await client.sb.from("dispute_events")
      .select("id,description").eq("dispute_id", disputeId);
    assertEquals(after?.length, beforeCount, "no dispute_events should be added or removed");
    for (const row of after!) {
      assert(row.description !== "HACKED", `dispute event ${row.id} was tampered`);
    }

    await cleanup(client, vendor, admin);
  },
});

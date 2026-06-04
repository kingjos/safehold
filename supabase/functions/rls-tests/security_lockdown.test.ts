// Verifies the post-lockdown security contract:
//  1. Anonymous callers cannot invoke any state-changing RPC.
//  2. Anonymous callers cannot write to wallets / transactions / disputes / *_events.
//  3. Authenticated users cannot bypass RPCs via direct table writes.
//  4. RPCs reject callers who are not the legitimate party (vendor-only, client-only).

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

assertExists(SUPABASE_URL, "SUPABASE_URL missing");
assertExists(ANON_KEY, "ANON key missing");

const HELPER_URL = `${SUPABASE_URL}/functions/v1/rls-test-helper`;
const rand = () => Math.random().toString(36).slice(2, 10);

async function helper(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch(HELPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`helper(${action}) failed: ${JSON.stringify(data)}`);
  return data;
}

interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

async function createUser(label: string): Promise<TestUser> {
  const email = `secLock_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}_${rand()}!`;
  const { user_id } = await helper("create_user", {
    email, password, full_name: `SecLock ${label}`,
  });
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, client };
}

async function cleanup(u: TestUser) {
  await helper("delete_user", { user_id: u.id }).catch(() => {});
}

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Seed a tx as the client (INSERT path is still RLS-allowed for clients).
async function seedTx(
  client: TestUser,
  vendorId: string,
  opts: Partial<{ amount: number; status: string }> = {},
) {
  const { data, error } = await client.client
    .from("transactions")
    .insert({
      client_id: client.id,
      vendor_id: vendorId,
      title: `SecLock ${rand()}`,
      amount: opts.amount ?? 1000,
      platform_fee: 15,
      status: opts.status ?? "pending_funding",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// 1. Anonymous cannot call any state-changing RPC
// ============================================================
Deno.test("anon cannot call SECURITY DEFINER RPCs", async (t) => {
  const anon = anonClient();
  const fakeId = "00000000-0000-0000-0000-000000000123";

  const cases: Array<[string, Record<string, unknown>]> = [
    ["create_dispute", { p_transaction_id: fakeId, p_reason: "service_not_delivered", p_description: "x" }],
    ["vendor_submit_dispute_response", { p_dispute_id: fakeId, p_response: "x", p_evidence_count: 0 }],
    ["log_dispute_evidence", { p_dispute_id: fakeId, p_file_name: "x.png" }],
    ["fund_escrow_from_wallet", { p_escrow_id: fakeId }],
    ["release_escrow_funds", { p_escrow_id: fakeId }],
    ["vendor_accept_escrow", { p_escrow_id: fakeId }],
    ["vendor_decline_escrow", { p_escrow_id: fakeId, p_reason: null }],
    ["vendor_mark_complete", { p_escrow_id: fakeId }],
    ["client_cancel_pending_escrow", { p_escrow_id: fakeId }],
    ["fund_wallet", { p_amount: 100, p_reference: null }],
    ["withdraw_wallet", { p_amount: 100, p_bank_details: null }],
    ["resolve_dispute", { p_dispute_id: fakeId, p_action: "release_vendor" }],
  ];

  for (const [fn, params] of cases) {
    await t.step(`anon → ${fn} is rejected`, async () => {
      const { error } = await anon.rpc(fn as any, params as any);
      assertExists(error, `${fn} should reject anonymous callers`);
    });
  }
});

// ============================================================
// 2. Anonymous cannot directly write protected tables
// ============================================================
Deno.test("anon cannot write protected tables", async (t) => {
  const anon = anonClient();
  const fakeUser = "00000000-0000-0000-0000-000000000999";

  await t.step("anon INSERT wallets is blocked", async () => {
    const { error } = await anon.from("wallets").insert({ user_id: fakeUser, balance: 1 });
    assertExists(error);
  });
  await t.step("anon UPDATE wallets is blocked / no-op", async () => {
    const { data, error } = await anon.from("wallets").update({ balance: 999_999 }).neq("id", "00000000-0000-0000-0000-000000000000").select();
    // Either RLS error or zero rows affected — both acceptable.
    if (!error) assertEquals(data?.length ?? 0, 0);
  });
  await t.step("anon INSERT transactions is blocked", async () => {
    const { error } = await anon.from("transactions").insert({
      client_id: fakeUser, title: "x", amount: 1, platform_fee: 0, status: "pending_funding",
    });
    assertExists(error);
  });
  await t.step("anon INSERT disputes is blocked", async () => {
    const { error } = await anon.from("disputes").insert({
      transaction_id: "00000000-0000-0000-0000-000000000000",
      opened_by: fakeUser, reason: "other", description: "x",
    });
    assertExists(error);
  });
  await t.step("anon INSERT transaction_events is blocked", async () => {
    const { error } = await anon.from("transaction_events").insert({
      transaction_id: "00000000-0000-0000-0000-000000000000",
      user_id: fakeUser, event_type: "spoof", description: "x",
    });
    assertExists(error);
  });
  await t.step("anon INSERT dispute_events is blocked", async () => {
    const { error } = await anon.from("dispute_events").insert({
      dispute_id: "00000000-0000-0000-0000-000000000000",
      user_id: fakeUser, event_type: "spoof", description: "x",
    });
    assertExists(error);
  });
});

// ============================================================
// 3. Authenticated users cannot bypass RPCs via direct writes
// ============================================================
Deno.test("authenticated users cannot mutate protected tables directly", async (t) => {
  const client = await createUser("c");
  const vendor = await createUser("v");
  await helper("set_wallet", { user_id: client.id, balance: 5000 });
  const tx = await seedTx(client, vendor.id, { status: "funded" });

  // Open a dispute via the RPC so we have a row to attempt to mutate.
  const { data: dispute, error: dErr } = await client.client.rpc("create_dispute", {
    p_transaction_id: tx.id,
    p_reason: "service_not_delivered",
    p_description: "lockdown test",
  });
  assertEquals(dErr, null, `create_dispute failed: ${dErr?.message}`);
  const disputeId = (dispute as any)?.id as string;
  assertExists(disputeId);

  await t.step("user cannot UPDATE their own wallet balance", async () => {
    const { data, error } = await client.client
      .from("wallets")
      .update({ balance: 999_999_999 })
      .eq("user_id", client.id)
      .select();
    // Policy was dropped → either error, or zero rows affected.
    if (!error) assertEquals(data?.length ?? 0, 0);

    const { data: bal } = await client.client.from("wallets").select("balance").eq("user_id", client.id).single();
    assert(Number(bal!.balance) < 999_999_999, "balance must not be tampered with");
  });

  await t.step("client cannot directly UPDATE transaction status", async () => {
    const { data, error } = await client.client
      .from("transactions")
      .update({ status: "completed" as any })
      .eq("id", tx.id)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);

    const { data: cur } = await client.client.from("transactions").select("status").eq("id", tx.id).single();
    assertEquals(cur?.status, "disputed", "status should remain whatever the RPCs set");
  });

  await t.step("vendor cannot directly UPDATE transaction status", async () => {
    const { data, error } = await vendor.client
      .from("transactions")
      .update({ status: "completed" as any })
      .eq("id", tx.id)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
  });

  await t.step("client cannot INSERT into transaction_events", async () => {
    const { error } = await client.client.from("transaction_events").insert({
      transaction_id: tx.id, user_id: client.id,
      event_type: "fabricated", description: "should be blocked",
    });
    assertExists(error);
  });

  await t.step("vendor cannot INSERT into transaction_events", async () => {
    const { error } = await vendor.client.from("transaction_events").insert({
      transaction_id: tx.id, user_id: vendor.id,
      event_type: "fabricated", description: "should be blocked",
    });
    assertExists(error);
  });

  await t.step("client cannot INSERT into dispute_events", async () => {
    const { error } = await client.client.from("dispute_events").insert({
      dispute_id: disputeId, user_id: client.id,
      event_type: "fabricated", description: "blocked",
    });
    assertExists(error);
  });

  await t.step("vendor cannot INSERT into dispute_events", async () => {
    const { error } = await vendor.client.from("dispute_events").insert({
      dispute_id: disputeId, user_id: vendor.id,
      event_type: "fabricated", description: "blocked",
    });
    assertExists(error);
  });

  await t.step("vendor cannot directly UPDATE disputes (status / resolution)", async () => {
    const { data, error } = await vendor.client
      .from("disputes")
      .update({ status: "resolved" as any, vendor_response: "tampered" })
      .eq("id", disputeId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);

    const { data: cur } = await vendor.client.from("disputes").select("status").eq("id", disputeId).single();
    assert(cur?.status !== "resolved", "vendor must not be able to mark dispute resolved");
  });

  await cleanup(client);
  await cleanup(vendor);
});

// ============================================================
// 4. RPCs enforce party-level authorization
// ============================================================
Deno.test("RPC party-level authorization", async (t) => {
  const client = await createUser("rpcC");
  const vendor = await createUser("rpcV");
  const outsider = await createUser("rpcO");
  await helper("set_wallet", { user_id: client.id, balance: 10_000 });
  const tx = await seedTx(client, vendor.id, { status: "pending_funding" });

  await t.step("outsider cannot fund escrow", async () => {
    const { error } = await outsider.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertExists(error);
  });

  await t.step("vendor cannot fund escrow", async () => {
    const { error } = await vendor.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertExists(error);
  });

  await t.step("client funds successfully", async () => {
    const { error } = await client.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertEquals(error, null);
  });

  await t.step("outsider cannot open dispute on others' tx (create_dispute)", async () => {
    const { error } = await outsider.client.rpc("create_dispute", {
      p_transaction_id: tx.id,
      p_reason: "service_not_delivered",
      p_description: "intrusion",
    });
    assertExists(error);
  });

  await t.step("client opens dispute via RPC", async () => {
    const { data, error } = await client.client.rpc("create_dispute", {
      p_transaction_id: tx.id,
      p_reason: "service_not_delivered",
      p_description: "real complaint",
    });
    assertEquals(error, null);
    assertExists((data as any)?.id);
  });

  // Fetch the dispute id back for response tests
  const { data: disputes } = await client.client
    .from("disputes")
    .select("id")
    .eq("transaction_id", tx.id)
    .limit(1);
  const disputeId = disputes?.[0]?.id as string;
  assertExists(disputeId);

  await t.step("outsider cannot submit vendor response", async () => {
    const { error } = await outsider.client.rpc("vendor_submit_dispute_response", {
      p_dispute_id: disputeId, p_response: "spoof", p_evidence_count: 0,
    });
    assertExists(error);
  });

  await t.step("client cannot submit vendor response", async () => {
    const { error } = await client.client.rpc("vendor_submit_dispute_response", {
      p_dispute_id: disputeId, p_response: "spoof", p_evidence_count: 0,
    });
    assertExists(error);
  });

  await t.step("vendor can submit response", async () => {
    const { error } = await vendor.client.rpc("vendor_submit_dispute_response", {
      p_dispute_id: disputeId, p_response: "we delivered", p_evidence_count: 0,
    });
    assertEquals(error, null);
  });

  await t.step("outsider cannot log dispute evidence", async () => {
    const { error } = await outsider.client.rpc("log_dispute_evidence", {
      p_dispute_id: disputeId, p_file_name: "x.png",
    });
    assertExists(error);
  });

  await t.step("non-admin cannot resolve dispute", async () => {
    const { error: cErr } = await client.client.rpc("resolve_dispute", {
      p_dispute_id: disputeId, p_action: "release_vendor",
    });
    assertExists(cErr);
    const { error: vErr } = await vendor.client.rpc("resolve_dispute", {
      p_dispute_id: disputeId, p_action: "refund_buyer",
    });
    assertExists(vErr);
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
});

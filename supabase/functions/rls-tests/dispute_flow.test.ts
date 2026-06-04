// End-to-end dispute lifecycle tests:
// dispute open -> evidence upload -> vendor response -> admin resolution
// Covers all 3 resolutions: refund_buyer, release_vendor, partial_refund.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

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
  const t = await res.text();
  const d = t ? JSON.parse(t) : {};
  if (!res.ok) throw new Error(JSON.stringify(d));
  return d;
}

async function makeUser(label: string) {
  const email = `dsp_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}!${rand()}`;
  const { user_id } = await helper("create_user", { email, password, full_name: `Dispute ${label}` });
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, sb };
}

async function setupFundedInProgressEscrow(amount = 10000, fee = 150) {
  const customer = await makeUser("cust");
  const vendor = await makeUser("vend");
  const admin = await makeUser("admin");
  await helper("grant_admin", { user_id: admin.id });
  await helper("set_wallet", { user_id: customer.id, balance: 200000 });

  const { data: tx, error } = await customer.sb.from("transactions").insert({
    client_id: customer.id, vendor_id: vendor.id, title: "Disputed job",
    description: "Work in dispute", amount, platform_fee: fee, status: "pending_funding",
  }).select().single();
  if (error) throw error;

  await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
  await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx.id });

  return { customer, vendor, admin, txId: tx.id, amount, fee };
}

async function cleanup(...users: { sb: any; id: string }[]) {
  for (const u of users) {
    try { await u.sb.auth.signOut(); } catch { /* */ }
    try { u.sb.removeAllChannels?.(); } catch { /* */ }
    try { await helper("delete_user", { user_id: u.id }); } catch { /* */ }
  }
}

Deno.test({
  name: "Dispute E2E: open -> evidence upload -> vendor response -> admin refunds buyer",
  sanitizeOps: false, sanitizeResources: false,
  fn: async (t) => {
    const { customer, vendor, admin, txId, amount, fee } =
      await setupFundedInProgressEscrow(10000, 150);
    let disputeId = "";

    await t.step("customer opens dispute", async () => {
      const { data, error } = await customer.sb.from("disputes").insert({
        transaction_id: txId, opened_by: customer.id,
        reason: "service_not_delivered", description: "Vendor never delivered the work.",
        status: "open",
      }).select().single();
      assertEquals(error, null);
      disputeId = data!.id;
    });

    await t.step("both parties can view dispute; stranger cannot", async () => {
      const stranger = await makeUser("strg");
      const { data: cd } = await customer.sb.from("disputes").select("id").eq("id", disputeId);
      const { data: vd } = await vendor.sb.from("disputes").select("id").eq("id", disputeId);
      const { data: sd } = await stranger.sb.from("disputes").select("id").eq("id", disputeId);
      assertEquals(cd?.length, 1);
      assertEquals(vd?.length, 1);
      assertEquals(sd?.length, 0);
      await cleanup(stranger);
    });

    await t.step("customer uploads evidence to dispute-evidence bucket", async () => {
      const path = `${disputeId}/customer-${rand()}.txt`;
      const blob = new Blob(["proof of non-delivery"], { type: "text/plain" });
      const { error: upErr } = await customer.sb.storage
        .from("dispute-evidence").upload(path, blob, { contentType: "text/plain" });
      assertEquals(upErr, null, `upload error: ${upErr?.message}`);

      const { error: rowErr } = await customer.sb.from("dispute_evidence").insert({
        dispute_id: disputeId, uploaded_by: customer.id,
        file_url: path, file_name: "proof.txt", file_type: "document",
      });
      assertEquals(rowErr, null);
    });

    await t.step("stranger cannot upload to dispute folder (RLS)", async () => {
      const stranger = await makeUser("strg2");
      const { error } = await stranger.sb.storage.from("dispute-evidence")
        .upload(`${disputeId}/hack-${rand()}.txt`, new Blob(["x"]));
      assert(error !== null, "stranger upload should be blocked");
      await cleanup(stranger);
    });

    await t.step("vendor submits response via RPC (only vendor_response + status)", async () => {
      const { error } = await vendor.sb.rpc("vendor_submit_dispute_response", {
        p_dispute_id: disputeId,
        p_response: "Work was delivered on time, see attached.",
        p_evidence_count: 0,
      });
      assertEquals(error, null);

      const { data } = await customer.sb.from("disputes")
        .select("vendor_response,status").eq("id", disputeId).single();
      assertEquals(data!.vendor_response, "Work was delivered on time, see attached.");
      assertEquals(data!.status, "under_review");
    });

    await t.step("vendor cannot tamper with status / resolution via direct UPDATE", async () => {
      await vendor.sb.from("disputes").update({ status: "resolved" }).eq("id", disputeId);
      await vendor.sb.from("disputes").update({ resolution: "free win" }).eq("id", disputeId);
      const { data } = await customer.sb.from("disputes").select("status,resolution").eq("id", disputeId).single();
      assertEquals(data!.status, "under_review");
      assertEquals(data!.resolution, null);
    });

    await t.step("non-admin cannot resolve dispute", async () => {
      const { error } = await customer.sb.rpc("resolve_dispute", {
        p_dispute_id: disputeId, p_action: "refund_buyer",
      });
      assert(error !== null, "non-admin should be blocked");
    });

    await t.step("admin resolves dispute -> full refund to buyer", async () => {
      const { data: walletBefore } = await customer.sb.from("wallets")
        .select("balance").eq("user_id", customer.id).single();
      const balBefore = Number(walletBefore!.balance);

      const { error } = await admin.sb.rpc("resolve_dispute", {
        p_dispute_id: disputeId, p_action: "refund_buyer",
      });
      assertEquals(error, null);

      const { data: d } = await admin.sb.from("disputes").select("status,resolution,resolved_at").eq("id", disputeId).single();
      assertEquals(d!.status, "resolved");
      assertExists(d!.resolved_at);
      assertExists(d!.resolution);

      const { data: tx } = await admin.sb.from("transactions").select("status").eq("id", txId).single();
      assertEquals(tx!.status, "refunded");

      const { data: walletAfter } = await customer.sb.from("wallets")
        .select("balance").eq("user_id", customer.id).single();
      assertEquals(Number(walletAfter!.balance) - balBefore, amount, "buyer wallet not credited by full amount");

      // both parties notified
      const { data: cn } = await customer.sb.from("notifications").select("id")
        .eq("dispute_id", disputeId).eq("type", "dispute_resolved");
      const { data: vn } = await vendor.sb.from("notifications").select("id")
        .eq("dispute_id", disputeId).eq("type", "dispute_resolved");
      assert((cn?.length ?? 0) > 0, "customer not notified");
      assert((vn?.length ?? 0) > 0, "vendor not notified");
    });

    await t.step("dispute parties can view evidence; admin can manage all", async () => {
      const { data: ev } = await vendor.sb.from("dispute_evidence").select("*").eq("dispute_id", disputeId);
      assert((ev?.length ?? 0) >= 1, "vendor cannot see customer evidence");
      const { data: adminEv } = await admin.sb.from("dispute_evidence").select("*").eq("dispute_id", disputeId);
      assert((adminEv?.length ?? 0) >= 1, "admin cannot see evidence");
    });

    await t.step("resolving an already-resolved dispute is rejected", async () => {
      const { error } = await admin.sb.rpc("resolve_dispute", {
        p_dispute_id: disputeId, p_action: "refund_buyer",
      });
      assert(error !== null, "double resolution should fail");
    });

    void fee;
    await cleanup(customer, vendor, admin);
  },
});

Deno.test({
  name: "Dispute E2E: admin releases full payment to vendor",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const { customer, vendor, admin, txId, amount } = await setupFundedInProgressEscrow(8000, 120);

    const { data: dispute } = await customer.sb.from("disputes").insert({
      transaction_id: txId, opened_by: customer.id,
      reason: "quality_issues", description: "Quality concerns",
      status: "open",
    }).select().single();

    const { error } = await admin.sb.rpc("resolve_dispute", {
      p_dispute_id: dispute!.id, p_action: "release_vendor",
    });
    assertEquals(error, null);

    const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assertEquals(Number(vw!.balance), amount);

    const { data: tx } = await admin.sb.from("transactions").select("status,completed_at").eq("id", txId).single();
    assertEquals(tx!.status, "completed");
    assertExists(tx!.completed_at);

    await cleanup(customer, vendor, admin);
  },
});

Deno.test({
  name: "Dispute E2E: admin issues partial refund (split funds)",
  sanitizeOps: false, sanitizeResources: false,
  fn: async () => {
    const { customer, vendor, admin, txId, amount } = await setupFundedInProgressEscrow(10000, 150);
    const partial = 4000;

    const { data: dispute } = await customer.sb.from("disputes").insert({
      transaction_id: txId, opened_by: customer.id,
      reason: "scope_disagreement", description: "Half done",
      status: "open",
    }).select().single();

    const { data: cwBefore } = await customer.sb.from("wallets")
      .select("balance").eq("user_id", customer.id).single();
    const balBefore = Number(cwBefore!.balance);

    const { error } = await admin.sb.rpc("resolve_dispute", {
      p_dispute_id: dispute!.id, p_action: "partial_refund", p_partial_amount: partial,
    });
    assertEquals(error, null);

    const { data: cwAfter } = await customer.sb.from("wallets")
      .select("balance").eq("user_id", customer.id).single();
    assertEquals(Number(cwAfter!.balance) - balBefore, partial, "buyer partial refund mismatch");

    const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assertEquals(Number(vw!.balance), amount - partial, "vendor remainder mismatch");

    // Reject invalid partial amount on a fresh dispute
    const { data: tx2 } = await customer.sb.from("transactions").insert({
      client_id: customer.id, vendor_id: vendor.id, title: "Bad partial",
      amount: 5000, platform_fee: 75, status: "pending_funding",
    }).select().single();
    await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: tx2!.id });
    await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: tx2!.id });
    const { data: d2 } = await customer.sb.from("disputes").insert({
      transaction_id: tx2!.id, opened_by: customer.id,
      reason: "other", description: "x", status: "open",
    }).select().single();
    const { error: badErr } = await admin.sb.rpc("resolve_dispute", {
      p_dispute_id: d2!.id, p_action: "partial_refund", p_partial_amount: 999999,
    });
    assert(badErr !== null, "over-amount partial refund should be rejected");

    await cleanup(customer, vendor, admin);
  },
});

// End-to-end escrow lifecycle integration tests.
// Covers: vendor lookup -> create -> fund -> notify -> accept -> complete -> release,
// plus vendor-decline (auto-refund), client-cancel-pre-funding, and direct-status tampering.
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
  const text = await res.text();
  const d = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(JSON.stringify(d));
  return d;
}

async function cleanup(...users: { sb: any; id: string }[]) {
  for (const u of users) {
    try { await u.sb.auth.signOut(); } catch { /* noop */ }
    try { u.sb.removeAllChannels?.(); } catch { /* noop */ }
    try { await u.sb.realtime?.disconnect?.(); } catch { /* noop */ }
    try { await helper("delete_user", { user_id: u.id }); } catch { /* noop */ }
  }
}

async function makeUser(label: string, phone?: string) {
  const email = `e2e_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}!${rand()}`;
  const { user_id } = await helper("create_user", { email, password, full_name: `E2E ${label}` });
  if (phone) await helper("set_phone", { user_id, phone });
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, sb };
}

async function createEscrow(client: any, vendorId: string, amount = 5000, fee = 75) {
  const { data, error } = await client.sb.from("transactions").insert({
    client_id: client.id, vendor_id: vendorId, title: "Demo job",
    description: "Build a landing page", amount, platform_fee: fee,
    status: "pending_funding",
  }).select().single();
  if (error) throw error;
  return data.id as string;
}

Deno.test("E2E: full happy-path lifecycle (fund -> accept -> complete -> release)", async (t) => {
  const phone = `0801${Math.floor(1000000 + Math.random() * 8999999)}`;
  const customer = await makeUser("cust");
  const vendor = await makeUser("vend", phone);
  await helper("set_wallet", { user_id: customer.id, balance: 100000 });

  let txId = "";

  await t.step("vendor lookup by phone", async () => {
    const { data, error } = await customer.sb.rpc("search_vendor_by_phone", { p_phone: phone });
    assertEquals(error, null);
    assertEquals((data ?? [])[0]?.user_id, vendor.id);
  });

  await t.step("create escrow (pending_funding)", async () => {
    txId = await createEscrow(customer, vendor.id);
  });

  await t.step("fund escrow from wallet -> status=funded + vendor notified", async () => {
    const { error } = await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data: tx } = await customer.sb.from("transactions").select("status,funded_at").eq("id", txId).single();
    assertEquals(tx!.status, "funded");
    assertExists(tx!.funded_at);

    const { data: notifs } = await vendor.sb.from("notifications").select("*")
      .eq("transaction_id", txId).eq("type", "escrow_funded");
    assert((notifs?.length ?? 0) > 0, "vendor missed escrow_funded notification");
  });

  await t.step("vendor accept_escrow -> in_progress + customer notified", async () => {
    const { error } = await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data: tx } = await vendor.sb.from("transactions").select("status,started_at").eq("id", txId).single();
    assertEquals(tx!.status, "in_progress");
    assertExists(tx!.started_at);

    const { data: notifs } = await customer.sb.from("notifications").select("*")
      .eq("transaction_id", txId).eq("type", "escrow_accepted");
    assert((notifs?.length ?? 0) > 0, "customer missed escrow_accepted notification");
  });

  await t.step("vendor cannot flip status directly via RLS", async () => {
    const { error } = await vendor.sb.from("transactions")
      .update({ status: "completed" }).eq("id", txId);
    // RLS WITH CHECK should reject the change (or simply update zero rows).
    const { data: tx } = await vendor.sb.from("transactions").select("status").eq("id", txId).single();
    assertEquals(tx!.status, "in_progress",
      `direct status update should not succeed (rpc error: ${error?.message ?? "none"})`);
  });

  await t.step("vendor mark_complete -> pending_release + customer notified", async () => {
    const { error } = await vendor.sb.rpc("vendor_mark_complete", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data: tx } = await vendor.sb.from("transactions").select("status").eq("id", txId).single();
    assertEquals(tx!.status, "pending_release");

    const { data: notifs } = await customer.sb.from("notifications").select("*")
      .eq("transaction_id", txId).eq("type", "escrow_pending_release");
    assert((notifs?.length ?? 0) > 0, "customer missed pending_release notification");
  });

  await t.step("customer release_escrow_funds -> completed + vendor wallet credited + notified", async () => {
    const { error } = await customer.sb.rpc("release_escrow_funds", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data: tx } = await customer.sb.from("transactions").select("status,completed_at").eq("id", txId).single();
    assertEquals(tx!.status, "completed");
    assertExists(tx!.completed_at);

    const { data: w } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assert(Number(w!.balance) >= 5000, "vendor wallet not credited");

    const { data: notifs } = await vendor.sb.from("notifications").select("*")
      .eq("transaction_id", txId).eq("type", "escrow_released");
    assert((notifs?.length ?? 0) > 0, "vendor missed escrow_released notification");
  });

  await helper("delete_user", { user_id: customer.id });
  await helper("delete_user", { user_id: vendor.id });
});

Deno.test("E2E: vendor decline auto-refunds the customer wallet", async () => {
  const phone = `0802${Math.floor(1000000 + Math.random() * 8999999)}`;
  const customer = await makeUser("cust2");
  const vendor = await makeUser("vend2", phone);
  await helper("set_wallet", { user_id: customer.id, balance: 100000 });

  const amount = 4000, fee = 60, total = amount + fee;
  const txId = await createEscrow(customer, vendor.id, amount, fee);

  // Fund
  await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });
  const { data: w1 } = await customer.sb.from("wallets").select("balance").eq("user_id", customer.id).single();
  const balAfterFund = Number(w1!.balance);
  assertEquals(balAfterFund, 100000 - total);

  // Vendor declines
  const { error } = await vendor.sb.rpc("vendor_decline_escrow", {
    p_escrow_id: txId, p_reason: "Out of capacity",
  });
  assertEquals(error, null);

  // Wallet refunded
  const { data: w2 } = await customer.sb.from("wallets").select("balance").eq("user_id", customer.id).single();
  assertEquals(Number(w2!.balance), 100000, "customer should be fully refunded");

  // Status cancelled + customer notified
  const { data: tx } = await customer.sb.from("transactions").select("status").eq("id", txId).single();
  assertEquals(tx!.status, "cancelled");

  const { data: notifs } = await customer.sb.from("notifications").select("*")
    .eq("transaction_id", txId).eq("type", "escrow_declined");
  assert((notifs?.length ?? 0) > 0, "customer missed escrow_declined notification");

  await helper("delete_user", { user_id: customer.id });
  await helper("delete_user", { user_id: vendor.id });
});

Deno.test("E2E: client cancels unfunded escrow and notifies vendor", async () => {
  const phone = `0803${Math.floor(1000000 + Math.random() * 8999999)}`;
  const customer = await makeUser("cust3");
  const vendor = await makeUser("vend3", phone);

  const txId = await createEscrow(customer, vendor.id);

  const { error } = await customer.sb.rpc("client_cancel_pending_escrow", { p_escrow_id: txId });
  assertEquals(error, null);

  const { data: tx } = await customer.sb.from("transactions").select("status").eq("id", txId).single();
  assertEquals(tx!.status, "cancelled");

  const { data: notifs } = await vendor.sb.from("notifications").select("*")
    .eq("transaction_id", txId).eq("type", "escrow_cancelled");
  assert((notifs?.length ?? 0) > 0, "vendor missed escrow_cancelled notification");

  await helper("delete_user", { user_id: customer.id });
  await helper("delete_user", { user_id: vendor.id });
});

Deno.test("E2E: only assigned vendor can accept/decline; non-vendor blocked", async () => {
  const customer = await makeUser("cust4");
  const vendor = await makeUser("vend4");
  const stranger = await makeUser("strg4");
  await helper("set_wallet", { user_id: customer.id, balance: 50000 });

  const txId = await createEscrow(customer, vendor.id, 3000, 45);
  await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });

  // Stranger cannot see or accept
  const { error: e1 } = await stranger.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
  assert(e1 !== null, "stranger should not be able to accept");

  // Customer cannot accept on vendor's behalf
  const { error: e2 } = await customer.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
  assert(e2 !== null, "customer should not be able to accept as vendor");

  // Real vendor succeeds
  const { error: e3 } = await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
  assertEquals(e3, null);

  await helper("delete_user", { user_id: customer.id });
  await helper("delete_user", { user_id: vendor.id });
  await helper("delete_user", { user_id: stranger.id });
});

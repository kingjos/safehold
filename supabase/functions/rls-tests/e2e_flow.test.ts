// End-to-end flow test: client creates escrow -> funds -> notifies vendor.
// Tests the actual user-visible flow (NOT just RLS).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d));
  return d;
}

async function makeUser(label: string, phone?: string) {
  const email = `e2e_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}!${rand()}`;
  const { user_id } = await helper("create_user", { email, password, full_name: `E2E ${label}` });
  if (phone) {
    // update phone in profile via service role
    await helper("set_phone", { user_id, phone }).catch(() => {});
  }
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, sb };
}

Deno.test("E2E: customer creates+funds escrow, vendor notification, full flow", async (t) => {
  const phone = `0801${Math.floor(1000000 + Math.random() * 8999999)}`;
  const customer = await makeUser("cust");
  const vendor = await makeUser("vend", phone);
  // give vendor a phone via service role
  await helper("set_phone", { user_id: vendor.id, phone });
  await helper("set_wallet", { user_id: customer.id, balance: 100000 });

  // 1) Vendor lookup by phone (the way CreateEscrow.tsx does it)
  let foundVendorId: string | null = null;
  await t.step("customer can search vendor by phone", async () => {
    const { data, error } = await customer.sb.rpc("search_vendor_by_phone", { p_phone: phone });
    assertEquals(error, null);
    assert((data ?? []).length > 0, "vendor not found by phone");
    foundVendorId = data![0].user_id;
    assertEquals(foundVendorId, vendor.id);
  });

  // 2) Customer creates escrow
  let txId: string | null = null;
  await t.step("customer creates escrow transaction", async () => {
    const { data, error } = await customer.sb.from("transactions").insert({
      client_id: customer.id, vendor_id: foundVendorId, title: "Demo job",
      description: "Build a landing page", amount: 5000, platform_fee: 75,
      status: "pending_funding",
    }).select().single();
    assertEquals(error, null);
    txId = data!.id;
  });

  // 3) Customer funds escrow from wallet
  await t.step("customer funds escrow from wallet", async () => {
    const { error } = await customer.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data } = await customer.sb.from("transactions").select("status,funded_at").eq("id", txId).single();
    assertEquals(data!.status, "funded");
    assertExists(data!.funded_at);
  });

  // 4) Vendor receives notification — exercises the EXACT path in CreateEscrow.tsx
  await t.step("vendor receives 'escrow_funded' notification (CreateEscrow flow)", async () => {
    const { error: nerr } = await customer.sb.from("notifications").insert({
      user_id: vendor.id, type: "escrow_funded",
      title: "New Escrow Funded", message: "Demo job (₦5,000) is now in escrow.",
      transaction_id: txId,
    });
    console.log("[notif insert as customer→vendor] error:", nerr?.message ?? "none");

    const { data } = await vendor.sb.from("notifications").select("*").eq("transaction_id", txId);
    console.log("[vendor sees notifications]:", data?.length, data);
    assert((data?.length ?? 0) > 0, "VENDOR DID NOT RECEIVE NOTIFICATION");
  });

  // 5) Vendor accepts (start work)
  await t.step("vendor accepts and starts work", async () => {
    const { error } = await vendor.sb.from("transactions")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", txId);
    assertEquals(error, null);
    // event
    await vendor.sb.from("transaction_events").insert({
      transaction_id: txId, user_id: vendor.id, event_type: "started",
      description: "Vendor started",
    });
  });

  // 6) Customer notified of acceptance
  await t.step("customer receives notification of vendor acceptance", async () => {
    const { error: nerr } = await vendor.sb.from("notifications").insert({
      user_id: customer.id, type: "escrow_accepted",
      title: "Vendor accepted", message: "Vendor started work.",
      transaction_id: txId,
    });
    console.log("[notif insert vendor→customer] error:", nerr?.message ?? "none");
    const { data } = await customer.sb.from("notifications").select("*").eq("transaction_id", txId);
    assert((data?.length ?? 0) > 0, "CUSTOMER DID NOT RECEIVE ACCEPTANCE NOTIFICATION");
  });

  // 7) Vendor declines? — there is no decline path; check if vendor can cancel
  await t.step("can vendor decline / cancel transaction?", async () => {
    const { data, error } = await vendor.sb.from("transactions")
      .update({ status: "cancelled" }).eq("id", txId).select();
    console.log("[vendor cancel] err:", error?.message, "rows:", data?.length);
  });

  // 8) Vendor marks complete -> client releases funds
  await t.step("vendor marks complete; customer releases funds", async () => {
    await vendor.sb.from("transactions").update({ status: "in_progress" }).eq("id", txId);
    await vendor.sb.from("transactions").update({ status: "pending_release" }).eq("id", txId);
    const { error } = await customer.sb.rpc("release_escrow_funds", { p_escrow_id: txId });
    assertEquals(error, null);
    const { data: w } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assert(Number(w!.balance) >= 5000, "vendor wallet not credited");
  });

  await helper("delete_user", { user_id: customer.id });
  await helper("delete_user", { user_id: vendor.id });
});

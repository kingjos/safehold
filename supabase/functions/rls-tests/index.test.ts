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

const rand = () => Math.random().toString(36).slice(2, 10);

interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

async function createUser(label: string): Promise<TestUser> {
  const email = `rlstest_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}_${rand()}!`;
  const { user_id } = await helper("create_user", {
    email, password, full_name: `RLS ${label}`,
  });

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return { id: user_id, email, password, client };
}

async function cleanupUser(u: TestUser) {
  await helper("delete_user", { user_id: u.id }).catch(() => {});
}

async function setWallet(userId: string, balance: number) {
  await helper("set_wallet", { user_id: userId, balance });
}

// Insert a transaction as the client user (RLS-allowed path)
async function seedTx(
  client: TestUser,
  vendorId: string,
  opts: Partial<{ amount: number; status: string; title: string }> = {},
) {
  const { data, error } = await client.client
    .from("transactions")
    .insert({
      client_id: client.id,
      vendor_id: vendorId,
      title: opts.title ?? `Test ${rand()}`,
      amount: opts.amount ?? 1000,
      platform_fee: 15,
      status: opts.status ?? "pending_funding",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Tests ----------

Deno.test("wallets RLS", async (t) => {
  const a = await createUser("walA");
  const b = await createUser("walB");
  await setWallet(a.id, 5000);
  await setWallet(b.id, 1000);

  await t.step("user can read own wallet", async () => {
    const { data, error } = await a.client.from("wallets").select("*").eq("user_id", a.id);
    assertEquals(error, null);
    assertEquals(data?.length, 1);
    assertEquals(Number(data![0].balance), 5000);
  });

  await t.step("user cannot read another user's wallet", async () => {
    const { data } = await a.client.from("wallets").select("*").eq("user_id", b.id);
    assertEquals(data?.length, 0);
  });

  await t.step("user cannot insert wallet for another user", async () => {
    const { error } = await a.client.from("wallets").insert({ user_id: b.id, balance: 9999 });
    assertExists(error);
  });

  await t.step("user cannot update another user's wallet", async () => {
    const { data } = await a.client.from("wallets").update({ balance: 1 }).eq("user_id", b.id).select();
    assertEquals(data?.length ?? 0, 0);
  });

  await cleanupUser(a);
  await cleanupUser(b);
});

Deno.test("escrow funding RLS & flow", async (t) => {
  const client = await createUser("clientE");
  const vendor = await createUser("vendorE");
  const outsider = await createUser("outE");
  await setWallet(client.id, 10_000);
  await setWallet(vendor.id, 0);
  const tx = await seedTx(client, vendor.id, { amount: 1000 });

  await t.step("client and vendor can view tx; outsider cannot", async () => {
    const { data: c } = await client.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(c?.length, 1);
    const { data: v } = await vendor.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(v?.length, 1);
    const { data: o } = await outsider.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(o?.length, 0);
  });

  await t.step("non-client cannot fund escrow", async () => {
    const { error } = await vendor.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertExists(error);
  });

  await t.step("client funds escrow successfully", async () => {
    const { error } = await client.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertEquals(error, null);
    const { data } = await client.client.from("transactions").select("status,funded_at").eq("id", tx.id).single();
    assertEquals(data?.status, "funded");
    assertExists(data?.funded_at);
  });

  await t.step("non-client cannot release funds", async () => {
    const { error } = await vendor.client.rpc("release_escrow_funds", { p_escrow_id: tx.id });
    assertExists(error);
  });

  await t.step("client releases funds; vendor wallet credited", async () => {
    const { error } = await client.client.rpc("release_escrow_funds", { p_escrow_id: tx.id });
    assertEquals(error, null);
    const { data } = await vendor.client.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assert(Number(data!.balance) >= 1000);
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
  await cleanupUser(outsider);
});

Deno.test("transaction_events RLS", async (t) => {
  const client = await createUser("clientTE");
  const vendor = await createUser("vendorTE");
  const outsider = await createUser("outTE");
  const tx = await seedTx(client, vendor.id);

  await t.step("party can insert event for own transaction", async () => {
    const { error } = await client.client.from("transaction_events").insert({
      transaction_id: tx.id, user_id: client.id,
      event_type: "note", description: "from client",
    });
    assertEquals(error, null);
  });

  await t.step("user cannot insert event with mismatched user_id", async () => {
    const { error } = await client.client.from("transaction_events").insert({
      transaction_id: tx.id, user_id: vendor.id,
      event_type: "spoof", description: "spoofed",
    });
    assertExists(error);
  });

  await t.step("outsider cannot insert events", async () => {
    const { error } = await outsider.client.from("transaction_events").insert({
      transaction_id: tx.id, user_id: outsider.id,
      event_type: "intrusion", description: "x",
    });
    assertExists(error);
  });

  await t.step("outsider cannot view events", async () => {
    const { data } = await outsider.client.from("transaction_events")
      .select("id").eq("transaction_id", tx.id);
    assertEquals(data?.length, 0);
  });

  await t.step("vendor can view events on shared transaction", async () => {
    const { data } = await vendor.client.from("transaction_events")
      .select("id").eq("transaction_id", tx.id);
    assert((data?.length ?? 0) >= 1);
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
  await cleanupUser(outsider);
});

Deno.test("notifications RLS", async (t) => {
  const a = await createUser("notifA");
  const b = await createUser("notifB");
  const { id: notifId } = await helper("seed_notification", {
    user_id: a.id, type: "info", title: "Hello", message: "test",
  });

  await t.step("user reads only own notifications", async () => {
    const { data: aData } = await a.client.from("notifications").select("id").eq("id", notifId);
    assertEquals(aData?.length, 1);
    const { data: bData } = await b.client.from("notifications").select("id").eq("id", notifId);
    assertEquals(bData?.length, 0);
  });

  await t.step("user cannot insert a notification for another user", async () => {
    const { error } = await a.client.from("notifications").insert({
      user_id: b.id, type: "spoof", title: "x", message: "y",
    });
    assertExists(error);
  });

  await t.step("user can mark own notification read; cannot update others'", async () => {
    const { data: ok } = await a.client.from("notifications")
      .update({ read: true }).eq("id", notifId).select();
    assertEquals(ok?.length, 1);
    const { data: blocked } = await b.client.from("notifications")
      .update({ read: true }).eq("id", notifId).select();
    assertEquals(blocked?.length ?? 0, 0);
  });

  await cleanupUser(a);
  await cleanupUser(b);
});

Deno.test("disputes RLS", async (t) => {
  const client = await createUser("clientD");
  const vendor = await createUser("vendorD");
  const outsider = await createUser("outD");
  await setWallet(client.id, 5000);
  const tx = await seedTx(client, vendor.id, { status: "funded" });
  let disputeId = "";

  await t.step("outsider cannot open dispute on others' tx", async () => {
    const { error } = await outsider.client.from("disputes").insert({
      transaction_id: tx.id, opened_by: outsider.id,
      reason: "service_not_delivered", description: "intrusion",
    });
    assertExists(error);
  });

  await t.step("client opens dispute on own tx", async () => {
    const { data, error } = await client.client.from("disputes").insert({
      transaction_id: tx.id, opened_by: client.id,
      reason: "service_not_delivered", description: "Item not delivered",
    }).select().single();
    assertEquals(error, null);
    disputeId = data!.id;
  });

  await t.step("vendor can view dispute; outsider cannot", async () => {
    const { data: v } = await vendor.client.from("disputes").select("id").eq("id", disputeId);
    assertEquals(v?.length, 1);
    const { data: o } = await outsider.client.from("disputes").select("id").eq("id", disputeId);
    assertEquals(o?.length, 0);
  });

  await t.step("vendor can post a response; outsider cannot update", async () => {
    const { data: vUpd } = await vendor.client.from("disputes")
      .update({ vendor_response: "We delivered" }).eq("id", disputeId).select();
    assertEquals(vUpd?.length, 1);
    const { data: oUpd } = await outsider.client.from("disputes")
      .update({ vendor_response: "spoof" }).eq("id", disputeId).select();
    assertEquals(oUpd?.length ?? 0, 0);
  });

  await t.step("dispute parties can add events; outsider cannot", async () => {
    const { error: ok } = await client.client.from("dispute_events").insert({
      dispute_id: disputeId, user_id: client.id,
      event_type: "comment", description: "Please respond",
    });
    assertEquals(ok, null);
    const { error: bad } = await outsider.client.from("dispute_events").insert({
      dispute_id: disputeId, user_id: outsider.id,
      event_type: "intrusion", description: "x",
    });
    assertExists(bad);
  });

  await t.step("non-admin cannot resolve dispute", async () => {
    const { error } = await client.client.rpc("resolve_dispute", {
      p_dispute_id: disputeId, p_action: "release_vendor",
    });
    assertExists(error);
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
  await cleanupUser(outsider);
});

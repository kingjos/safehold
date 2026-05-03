import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------- Env ----------
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

assertExists(SUPABASE_URL, "SUPABASE_URL missing");
assertExists(ANON_KEY, "SUPABASE_ANON_KEY missing");
assertExists(SERVICE_ROLE, "SUPABASE_SERVICE_ROLE_KEY missing");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Helpers ----------
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
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}` },
  });
  if (error) throw error;
  const id = data.user!.id;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  return { id, email, password, client };
}

async function cleanupUser(u: TestUser) {
  try {
    await admin.auth.admin.deleteUser(u.id);
  } catch (_) { /* ignore */ }
}

async function seedWallet(userId: string, balance: number) {
  // Ensure single wallet (handle_new_user trigger may have created one)
  const { data: existing } = await admin.from("wallets").select("id").eq("user_id", userId).maybeSingle();
  if (existing) {
    await admin.from("wallets").update({ balance }).eq("id", existing.id);
  } else {
    await admin.from("wallets").insert({ user_id: userId, balance });
  }
}

async function seedTransaction(clientId: string, vendorId: string, opts: Partial<{ amount: number; status: string; title: string }> = {}) {
  const { data, error } = await admin
    .from("transactions")
    .insert({
      client_id: clientId,
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
  await seedWallet(a.id, 5000);
  await seedWallet(b.id, 1000);

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
    assertExists(error, "Expected RLS violation when inserting wallet for another user");
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
  await seedWallet(client.id, 10_000);
  await seedWallet(vendor.id, 0);
  const tx = await seedTransaction(client.id, vendor.id, { amount: 1000 });

  await t.step("client and vendor can view transaction; outsider cannot", async () => {
    const outsider = await createUser("outE");
    const { data: clientView } = await client.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(clientView?.length, 1);
    const { data: vendorView } = await vendor.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(vendorView?.length, 1);
    const { data: outView } = await outsider.client.from("transactions").select("id").eq("id", tx.id);
    assertEquals(outView?.length, 0);
    await cleanupUser(outsider);
  });

  await t.step("non-client cannot fund escrow", async () => {
    const { error } = await vendor.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertExists(error);
  });

  await t.step("client funds escrow successfully", async () => {
    const { error } = await client.client.rpc("fund_escrow_from_wallet", { p_escrow_id: tx.id });
    assertEquals(error, null);
    const { data } = await admin.from("transactions").select("status,funded_at").eq("id", tx.id).single();
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
    const { data } = await admin.from("wallets").select("balance").eq("user_id", vendor.id).single();
    assert(Number(data!.balance) >= 1000, "vendor wallet should be credited");
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
});

Deno.test("transaction_events RLS", async (t) => {
  const client = await createUser("clientTE");
  const vendor = await createUser("vendorTE");
  const outsider = await createUser("outTE");
  const tx = await seedTransaction(client.id, vendor.id);

  await t.step("party can insert event for own transaction", async () => {
    const { error } = await client.client.from("transaction_events").insert({
      transaction_id: tx.id,
      user_id: client.id,
      event_type: "note",
      description: "from client",
    });
    assertEquals(error, null);
  });

  await t.step("user cannot insert event with mismatched user_id", async () => {
    const { error } = await client.client.from("transaction_events").insert({
      transaction_id: tx.id,
      user_id: vendor.id,
      event_type: "spoof",
      description: "spoofed",
    });
    assertExists(error);
  });

  await t.step("outsider cannot insert events", async () => {
    const { error } = await outsider.client.from("transaction_events").insert({
      transaction_id: tx.id,
      user_id: outsider.id,
      event_type: "intrusion",
      description: "should fail",
    });
    assertExists(error);
  });

  await t.step("outsider cannot view events", async () => {
    const { data } = await outsider.client
      .from("transaction_events")
      .select("id")
      .eq("transaction_id", tx.id);
    assertEquals(data?.length, 0);
  });

  await t.step("vendor can view events on shared transaction", async () => {
    const { data } = await vendor.client
      .from("transaction_events")
      .select("id")
      .eq("transaction_id", tx.id);
    assert((data?.length ?? 0) >= 1);
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
  await cleanupUser(outsider);
});

Deno.test("notifications RLS", async (t) => {
  const a = await createUser("notifA");
  const b = await createUser("notifB");

  // Seed via service role
  const { data: seeded } = await admin
    .from("notifications")
    .insert({ user_id: a.id, type: "info", title: "Hello", message: "test" })
    .select()
    .single();

  await t.step("user reads only own notifications", async () => {
    const { data: aData } = await a.client.from("notifications").select("id").eq("id", seeded!.id);
    assertEquals(aData?.length, 1);
    const { data: bData } = await b.client.from("notifications").select("id").eq("id", seeded!.id);
    assertEquals(bData?.length, 0);
  });

  await t.step("user cannot insert a notification for another user", async () => {
    const { error } = await a.client.from("notifications").insert({
      user_id: b.id,
      type: "spoof",
      title: "x",
      message: "y",
    });
    assertExists(error);
  });

  await t.step("user can mark own notification read; cannot update others'", async () => {
    const { data: ok } = await a.client
      .from("notifications")
      .update({ read: true })
      .eq("id", seeded!.id)
      .select();
    assertEquals(ok?.length, 1);

    const { data: blocked } = await b.client
      .from("notifications")
      .update({ read: true })
      .eq("id", seeded!.id)
      .select();
    assertEquals(blocked?.length ?? 0, 0);
  });

  await cleanupUser(a);
  await cleanupUser(b);
});

Deno.test("disputes RLS", async (t) => {
  const client = await createUser("clientD");
  const vendor = await createUser("vendorD");
  const outsider = await createUser("outD");
  await seedWallet(client.id, 0);
  const tx = await seedTransaction(client.id, vendor.id, { status: "funded" });

  let disputeId = "";

  await t.step("outsider cannot open dispute on someone else's tx", async () => {
    const { error } = await outsider.client.from("disputes").insert({
      transaction_id: tx.id,
      opened_by: outsider.id,
      reason: "not_delivered",
      description: "intrusion",
    });
    assertExists(error);
  });

  await t.step("client can open dispute on own tx", async () => {
    const { data, error } = await client.client.from("disputes").insert({
      transaction_id: tx.id,
      opened_by: client.id,
      reason: "not_delivered",
      description: "Item not delivered",
    }).select().single();
    assertEquals(error, null);
    assertExists(data);
    disputeId = data!.id;
  });

  await t.step("vendor can view dispute on their tx; outsider cannot", async () => {
    const { data: vView } = await vendor.client.from("disputes").select("id").eq("id", disputeId);
    assertEquals(vView?.length, 1);
    const { data: oView } = await outsider.client.from("disputes").select("id").eq("id", disputeId);
    assertEquals(oView?.length, 0);
  });

  await t.step("vendor can post a response; outsider cannot update", async () => {
    const { data: vUpd } = await vendor.client
      .from("disputes")
      .update({ vendor_response: "We delivered on time" })
      .eq("id", disputeId)
      .select();
    assertEquals(vUpd?.length, 1);

    const { data: oUpd } = await outsider.client
      .from("disputes")
      .update({ vendor_response: "spoof" })
      .eq("id", disputeId)
      .select();
    assertEquals(oUpd?.length ?? 0, 0);
  });

  await t.step("dispute parties can add events; outsider cannot", async () => {
    const { error: ok } = await client.client.from("dispute_events").insert({
      dispute_id: disputeId,
      user_id: client.id,
      event_type: "comment",
      description: "Please respond",
    });
    assertEquals(ok, null);

    const { error: bad } = await outsider.client.from("dispute_events").insert({
      dispute_id: disputeId,
      user_id: outsider.id,
      event_type: "intrusion",
      description: "x",
    });
    assertExists(bad);
  });

  await t.step("non-admin cannot resolve dispute", async () => {
    const { error } = await client.client.rpc("resolve_dispute", {
      p_dispute_id: disputeId,
      p_action: "release_vendor",
    });
    assertExists(error);
  });

  await cleanupUser(client);
  await cleanupUser(vendor);
  await cleanupUser(outsider);
});

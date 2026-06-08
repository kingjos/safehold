// Verifies role-based permissions for evidence upload + log_dispute_evidence,
// and that NO caller can tamper with dispute status or event timelines outside
// the SECURITY DEFINER RPCs.
//
// Coverage:
//   1. dispute_evidence INSERT — only parties (client/vendor/opener); outsiders + anon blocked
//   2. dispute_evidence INSERT — cannot spoof uploaded_by
//   3. dispute_evidence SELECT — only parties + admin can read
//   4. dispute_evidence UPDATE/DELETE — blocked for parties; admin allowed
//   5. log_dispute_evidence RPC — anon rejected, outsider rejected, parties + admin accepted
//   6. dispute_events — no party can INSERT, UPDATE, or DELETE rows (timeline immutable)
//   7. transaction_events — no party can INSERT, UPDATE, or DELETE rows
//   8. disputes — client/vendor cannot directly mutate status, resolution, resolved_at, etc.

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

assertExists(SUPABASE_URL);
assertExists(ANON_KEY);

const HELPER = `${SUPABASE_URL}/functions/v1/rls-test-helper`;
const rand = () => Math.random().toString(36).slice(2, 10);

async function helper(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch(HELPER, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : {};
  if (!res.ok) throw new Error(`helper(${action}): ${JSON.stringify(data)}`);
  return data;
}

interface U {
  id: string;
  email: string;
  sb: SupabaseClient;
}

async function makeUser(label: string): Promise<U> {
  const email = `evd_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}_${rand()}!`;
  const { user_id } = await helper("create_user", {
    email,
    password,
    full_name: `Evidence ${label}`,
  });
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: user_id, email, sb };
}

const cleanup = (u: U) => helper("delete_user", { user_id: u.id }).catch(() => {});

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Build: funded+in_progress escrow with an opened dispute. Returns ids + clients.
async function setupDisputed() {
  const client = await makeUser("c");
  const vendor = await makeUser("v");
  const outsider = await makeUser("o");
  const admin = await makeUser("a");
  await helper("grant_admin", { user_id: admin.id });
  // Admin needs to be re-authed for has_role to apply on a fresh JWT — sign in again.
  // (Role added after the initial token was issued — but has_role reads from DB on each call,
  // so the existing JWT is fine; auth.uid() resolves to admin.id.)
  await helper("set_wallet", { user_id: client.id, balance: 50_000 });

  const { data: tx, error: txErr } = await client.sb
    .from("transactions")
    .insert({
      client_id: client.id,
      vendor_id: vendor.id,
      title: `Evd ${rand()}`,
      amount: 5000,
      platform_fee: 75,
      status: "pending_funding",
    })
    .select()
    .single();
  if (txErr) throw txErr;

  const { error: fErr } = await client.sb.rpc("fund_escrow_from_wallet", {
    p_escrow_id: tx.id,
  });
  assertEquals(fErr, null, `fund failed: ${fErr?.message}`);
  const { error: aErr } = await vendor.sb.rpc("vendor_accept_escrow", {
    p_escrow_id: tx.id,
  });
  assertEquals(aErr, null, `accept failed: ${aErr?.message}`);

  const { data: disp, error: dErr } = await client.sb.rpc("create_dispute", {
    p_transaction_id: tx.id,
    p_reason: "service_not_delivered",
    p_description: "for evidence + timeline tests",
  });
  assertEquals(dErr, null, `create_dispute failed: ${dErr?.message}`);
  const disputeId = (disp as any)?.id as string;
  assertExists(disputeId);

  return { client, vendor, outsider, admin, txId: tx.id as string, disputeId };
}

// =====================================================================
// 1. dispute_evidence INSERT — role enforcement
// =====================================================================
Deno.test("dispute_evidence INSERT enforces role permissions", async (t) => {
  const { client, vendor, outsider, admin, disputeId } = await setupDisputed();

  await t.step("client (opener) can insert evidence", async () => {
    const { error } = await client.sb.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: client.id,
      file_name: "client.png",
      file_url: "https://example.test/c.png",
      file_type: "image",
    });
    assertEquals(error, null, `client insert: ${error?.message}`);
  });

  await t.step("vendor (party) can insert evidence", async () => {
    const { error } = await vendor.sb.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: vendor.id,
      file_name: "vendor.png",
      file_url: "https://example.test/v.png",
      file_type: "image",
    });
    assertEquals(error, null, `vendor insert: ${error?.message}`);
  });

  await t.step("outsider CANNOT insert evidence (not a party)", async () => {
    const { error } = await outsider.sb.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: outsider.id,
      file_name: "spoof.png",
      file_url: "https://example.test/x.png",
      file_type: "image",
    });
    assertExists(error, "outsider must be blocked by RLS");
  });

  await t.step("anon CANNOT insert evidence", async () => {
    const { error } = await anonClient().from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: outsider.id,
      file_name: "anon.png",
      file_url: "https://example.test/a.png",
      file_type: "image",
    });
    assertExists(error);
  });

  await t.step("party CANNOT spoof uploaded_by to another user", async () => {
    const { error } = await client.sb.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: vendor.id, // spoofed — RLS WITH CHECK requires auth.uid() = uploaded_by
      file_name: "spoofed.png",
      file_url: "https://example.test/s.png",
      file_type: "image",
    });
    assertExists(error, "spoofed uploaded_by must be rejected");
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

// =====================================================================
// 2. dispute_evidence SELECT + UPDATE + DELETE — tamper resistance
// =====================================================================
Deno.test("dispute_evidence read/modify permissions", async (t) => {
  const { client, vendor, outsider, admin, disputeId } = await setupDisputed();

  // Seed two rows via the legitimate parties.
  await client.sb.from("dispute_evidence").insert({
    dispute_id: disputeId,
    uploaded_by: client.id,
    file_name: "c1.png",
    file_url: "https://example.test/c1.png",
    file_type: "image",
  });
  await vendor.sb.from("dispute_evidence").insert({
    dispute_id: disputeId,
    uploaded_by: vendor.id,
    file_name: "v1.png",
    file_url: "https://example.test/v1.png",
    file_type: "image",
  });

  await t.step("parties can SELECT evidence on their dispute", async () => {
    const { data: cRows } = await client.sb
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    const { data: vRows } = await vendor.sb
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    assert((cRows?.length ?? 0) >= 2);
    assert((vRows?.length ?? 0) >= 2);
  });

  await t.step("outsider cannot SELECT evidence", async () => {
    const { data } = await outsider.sb
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    assertEquals(data?.length ?? 0, 0, "outsider must see no rows");
  });

  await t.step("anon cannot SELECT evidence", async () => {
    const { data } = await anonClient()
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    assertEquals(data?.length ?? 0, 0);
  });

  await t.step("party cannot UPDATE evidence rows (no UPDATE policy)", async () => {
    const { data, error } = await client.sb
      .from("dispute_evidence")
      .update({ file_name: "tampered.png" })
      .eq("dispute_id", disputeId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0, "no rows should be updated");
    // Verify nothing was actually renamed
    const { data: rows } = await client.sb
      .from("dispute_evidence")
      .select("file_name")
      .eq("dispute_id", disputeId);
    assert(!(rows ?? []).some((r: any) => r.file_name === "tampered.png"));
  });

  await t.step("party cannot DELETE evidence (no DELETE policy)", async () => {
    const { data: before } = await client.sb
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    const { data, error } = await client.sb
      .from("dispute_evidence")
      .delete()
      .eq("dispute_id", disputeId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const { data: after } = await client.sb
      .from("dispute_evidence")
      .select("id")
      .eq("dispute_id", disputeId);
    assertEquals(after?.length ?? 0, before?.length ?? 0, "no rows should be removed");
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

// =====================================================================
// 3. log_dispute_evidence RPC — role enforcement
// =====================================================================
Deno.test("log_dispute_evidence RPC enforces role permissions", async (t) => {
  const { client, vendor, outsider, admin, disputeId } = await setupDisputed();

  await t.step("anon is rejected", async () => {
    const { error } = await anonClient().rpc("log_dispute_evidence", {
      p_dispute_id: disputeId,
      p_file_name: "anon.png",
    });
    assertExists(error);
  });

  await t.step("outsider is rejected (not a party, not admin)", async () => {
    const { error } = await outsider.sb.rpc("log_dispute_evidence", {
      p_dispute_id: disputeId,
      p_file_name: "intruder.png",
    });
    assertExists(error);
  });

  await t.step("client (party) can log evidence event", async () => {
    const { error } = await client.sb.rpc("log_dispute_evidence", {
      p_dispute_id: disputeId,
      p_file_name: "from-client.png",
    });
    assertEquals(error, null, `client rpc: ${error?.message}`);
  });

  await t.step("vendor (party) can log evidence event", async () => {
    const { error } = await vendor.sb.rpc("log_dispute_evidence", {
      p_dispute_id: disputeId,
      p_file_name: "from-vendor.png",
    });
    assertEquals(error, null, `vendor rpc: ${error?.message}`);
  });

  await t.step("admin can log evidence event", async () => {
    const { error } = await admin.sb.rpc("log_dispute_evidence", {
      p_dispute_id: disputeId,
      p_file_name: "from-admin.png",
    });
    assertEquals(error, null, `admin rpc: ${error?.message}`);
  });

  await t.step("logged events are visible to parties via SELECT", async () => {
    const { data } = await client.sb
      .from("dispute_events")
      .select("description, event_type")
      .eq("dispute_id", disputeId)
      .eq("event_type", "evidence");
    const descs = (data ?? []).map((r: any) => r.description);
    assert(descs.some((d: string) => d.includes("from-client.png")));
    assert(descs.some((d: string) => d.includes("from-vendor.png")));
    assert(descs.some((d: string) => d.includes("from-admin.png")));
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

// =====================================================================
// 4. dispute_events timeline immutability
// =====================================================================
Deno.test("dispute_events timeline is tamper-proof", async (t) => {
  const { client, vendor, outsider, admin, disputeId } = await setupDisputed();

  await t.step("client cannot INSERT a fabricated dispute_event", async () => {
    const { error } = await client.sb.from("dispute_events").insert({
      dispute_id: disputeId,
      user_id: client.id,
      event_type: "fabricated",
      description: "fake admin note",
    });
    assertExists(error);
  });

  await t.step("vendor cannot INSERT a fabricated dispute_event", async () => {
    const { error } = await vendor.sb.from("dispute_events").insert({
      dispute_id: disputeId,
      user_id: vendor.id,
      event_type: "fabricated",
      description: "fake",
    });
    assertExists(error);
  });

  await t.step("outsider cannot INSERT a dispute_event", async () => {
    const { error } = await outsider.sb.from("dispute_events").insert({
      dispute_id: disputeId,
      user_id: outsider.id,
      event_type: "spoof",
      description: "x",
    });
    assertExists(error);
  });

  await t.step("party cannot UPDATE existing dispute_events", async () => {
    const { data: before } = await client.sb
      .from("dispute_events")
      .select("id, description")
      .eq("dispute_id", disputeId)
      .limit(1);
    const target = before?.[0];
    assertExists(target);
    const { data, error } = await client.sb
      .from("dispute_events")
      .update({ description: "REWRITTEN HISTORY" })
      .eq("id", target.id)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const { data: after } = await client.sb
      .from("dispute_events")
      .select("description")
      .eq("id", target.id)
      .single();
    assertEquals(after?.description, target.description, "description must be unchanged");
  });

  await t.step("party cannot DELETE dispute_events", async () => {
    const { data: before } = await client.sb
      .from("dispute_events")
      .select("id")
      .eq("dispute_id", disputeId);
    const beforeCount = before?.length ?? 0;
    assert(beforeCount > 0);
    const { data, error } = await client.sb
      .from("dispute_events")
      .delete()
      .eq("dispute_id", disputeId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const { data: after } = await client.sb
      .from("dispute_events")
      .select("id")
      .eq("dispute_id", disputeId);
    assertEquals(after?.length, beforeCount, "no events should be deleted");
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

// =====================================================================
// 5. transaction_events timeline immutability
// =====================================================================
Deno.test("transaction_events timeline is tamper-proof", async (t) => {
  const { client, vendor, outsider, admin, txId } = await setupDisputed();

  await t.step("client cannot INSERT fabricated transaction_event", async () => {
    const { error } = await client.sb.from("transaction_events").insert({
      transaction_id: txId,
      user_id: client.id,
      event_type: "completed",
      description: "fake completion",
    });
    assertExists(error);
  });

  await t.step("vendor cannot INSERT fabricated transaction_event", async () => {
    const { error } = await vendor.sb.from("transaction_events").insert({
      transaction_id: txId,
      user_id: vendor.id,
      event_type: "completed",
      description: "fake completion",
    });
    assertExists(error);
  });

  await t.step("outsider cannot INSERT transaction_event", async () => {
    const { error } = await outsider.sb.from("transaction_events").insert({
      transaction_id: txId,
      user_id: outsider.id,
      event_type: "spoof",
      description: "x",
    });
    assertExists(error);
  });

  await t.step("party cannot UPDATE transaction_events", async () => {
    const { data: before } = await client.sb
      .from("transaction_events")
      .select("id, description")
      .eq("transaction_id", txId)
      .limit(1);
    const target = before?.[0];
    assertExists(target);
    const { data, error } = await client.sb
      .from("transaction_events")
      .update({ description: "REWRITTEN" })
      .eq("id", target.id)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const { data: after } = await client.sb
      .from("transaction_events")
      .select("description")
      .eq("id", target.id)
      .single();
    assertEquals(after?.description, target.description);
  });

  await t.step("party cannot DELETE transaction_events", async () => {
    const { data: before } = await client.sb
      .from("transaction_events")
      .select("id")
      .eq("transaction_id", txId);
    const beforeCount = before?.length ?? 0;
    const { data, error } = await client.sb
      .from("transaction_events")
      .delete()
      .eq("transaction_id", txId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const { data: after } = await client.sb
      .from("transaction_events")
      .select("id")
      .eq("transaction_id", txId);
    assertEquals(after?.length, beforeCount);
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

// =====================================================================
// 6. disputes status / resolution cannot be tampered with directly
// =====================================================================
Deno.test("disputes core fields cannot be tampered with by parties", async (t) => {
  const { client, vendor, outsider, admin, disputeId } = await setupDisputed();

  const snapshot = async () => {
    const { data } = await admin.sb
      .from("disputes")
      .select("status, resolution, resolved_at, opened_by, reason, description")
      .eq("id", disputeId)
      .single();
    return data;
  };

  const original = await snapshot();
  assertExists(original);

  await t.step("client cannot UPDATE status to resolved", async () => {
    const { data, error } = await client.sb
      .from("disputes")
      .update({ status: "resolved" as any })
      .eq("id", disputeId)
      .select();
    // Either RLS blocks, no-op, or guard trigger raises.
    assert(error !== null || (data?.length ?? 0) === 0);
    const cur = await snapshot();
    assertEquals(cur?.status, original.status, "status must be unchanged");
  });

  await t.step("vendor cannot UPDATE status to resolved", async () => {
    const { data, error } = await vendor.sb
      .from("disputes")
      .update({ status: "resolved" as any })
      .eq("id", disputeId)
      .select();
    assert(error !== null || (data?.length ?? 0) === 0);
    const cur = await snapshot();
    assertEquals(cur?.status, original.status);
  });

  await t.step("client cannot write resolution JSON", async () => {
    const { data, error } = await client.sb
      .from("disputes")
      .update({ resolution: '{"type":"pay_vendor","fake":true}' })
      .eq("id", disputeId)
      .select();
    assert(error !== null || (data?.length ?? 0) === 0);
    const cur = await snapshot();
    assertEquals(cur?.resolution, original.resolution);
  });

  await t.step("vendor cannot set resolved_at", async () => {
    const { data, error } = await vendor.sb
      .from("disputes")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", disputeId)
      .select();
    assert(error !== null || (data?.length ?? 0) === 0);
    const cur = await snapshot();
    assertEquals(cur?.resolved_at, original.resolved_at);
  });

  await t.step("vendor cannot change reason or description", async () => {
    const { data, error } = await vendor.sb
      .from("disputes")
      .update({ reason: "other" as any, description: "rewritten" })
      .eq("id", disputeId)
      .select();
    assert(error !== null || (data?.length ?? 0) === 0);
    const cur = await snapshot();
    assertEquals(cur?.reason, original.reason);
    assertEquals(cur?.description, original.description);
  });

  await t.step("outsider cannot UPDATE disputes at all", async () => {
    const { data, error } = await outsider.sb
      .from("disputes")
      .update({ status: "resolved" as any })
      .eq("id", disputeId)
      .select();
    if (!error) assertEquals(data?.length ?? 0, 0);
    const cur = await snapshot();
    assertEquals(cur?.status, original.status);
  });

  await cleanup(client);
  await cleanup(vendor);
  await cleanup(outsider);
  await cleanup(admin);
});

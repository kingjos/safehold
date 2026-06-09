// Full end-to-end escrow lifecycle test.
// Walks the entire flow across all three roles (client, vendor, admin) in one test:
//
//   1. Client funds wallet -> creates escrow -> funds escrow
//   2. Vendor accepts -> marks complete
//   3. Happy path: client releases funds -> vendor wallet credited
//   4. Dispute path: open dispute via RPC, both parties upload evidence,
//      vendor submits response, admin resolves with partial refund
//   5. Permission checks at every stage (strangers / wrong role blocked)
//
// This is the umbrella "does the whole system work together" test.
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
  const txt = await res.text();
  const d = txt ? JSON.parse(txt) : {};
  if (!res.ok) throw new Error(JSON.stringify(d));
  return d;
}

async function makeUser(label: string, phone?: string) {
  const email = `full_${label}_${rand()}@example.test`;
  const password = `Pwd_${rand()}!${rand()}`;
  const { user_id } = await helper("create_user", { email, password, full_name: `Full ${label}` });
  if (phone) await helper("set_phone", { user_id, phone });
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

Deno.test({
  name: "Full E2E: happy-path release across client/vendor roles",
  sanitizeOps: false, sanitizeResources: false,
  fn: async (t) => {
    const phone = `0811${Math.floor(1000000 + Math.random() * 8999999)}`;
    const client = await makeUser("client", phone.replace("0811", "0820"));
    const vendor = await makeUser("vendor", phone);
    const stranger = await makeUser("stranger");
    const amount = 20000, fee = 300, total = amount + fee;
    let txId = "";

    await t.step("client funds wallet via fund_wallet RPC", async () => {
      const { error } = await client.sb.rpc("fund_wallet", { p_amount: 100000, p_reference: "test-topup" });
      assertEquals(error, null);
      const { data: w } = await client.sb.from("wallets").select("balance").eq("user_id", client.id).single();
      assertEquals(Number(w!.balance), 100000);
    });

    await t.step("client looks up vendor by phone", async () => {
      const { data, error } = await client.sb.rpc("search_vendor_by_phone", { p_phone: phone });
      assertEquals(error, null);
      assertEquals((data ?? [])[0]?.user_id, vendor.id);
    });

    await t.step("client creates escrow (pending_funding)", async () => {
      const { data, error } = await client.sb.from("transactions").insert({
        client_id: client.id, vendor_id: vendor.id, title: "E2E job",
        description: "Full lifecycle test", amount, platform_fee: fee, status: "pending_funding",
      }).select().single();
      assertEquals(error, null);
      txId = data!.id;
    });

    await t.step("stranger cannot see the escrow", async () => {
      const { data } = await stranger.sb.from("transactions").select("id").eq("id", txId);
      assertEquals(data?.length, 0);
    });

    await t.step("client funds escrow from wallet -> vendor notified", async () => {
      const { error } = await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });
      assertEquals(error, null);
      const { data: tx } = await client.sb.from("transactions").select("status,funded_at").eq("id", txId).single();
      assertEquals(tx!.status, "funded");
      assertExists(tx!.funded_at);
      const { data: w } = await client.sb.from("wallets").select("balance").eq("user_id", client.id).single();
      assertEquals(Number(w!.balance), 100000 - total);
      const { data: n } = await vendor.sb.from("notifications").select("id")
        .eq("transaction_id", txId).eq("type", "escrow_funded");
      assert((n?.length ?? 0) > 0, "vendor missed funded notification");
    });

    await t.step("stranger cannot accept escrow as vendor", async () => {
      const { error } = await stranger.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
      assert(error !== null);
    });

    await t.step("vendor accepts -> in_progress + client notified", async () => {
      const { error } = await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
      assertEquals(error, null);
      const { data: tx } = await vendor.sb.from("transactions").select("status,started_at").eq("id", txId).single();
      assertEquals(tx!.status, "in_progress");
      assertExists(tx!.started_at);
      const { data: n } = await client.sb.from("notifications").select("id")
        .eq("transaction_id", txId).eq("type", "escrow_accepted");
      assert((n?.length ?? 0) > 0);
    });

    await t.step("client cannot mark complete on vendor's behalf", async () => {
      const { error } = await client.sb.rpc("vendor_mark_complete", { p_escrow_id: txId });
      assert(error !== null);
    });

    await t.step("vendor marks complete -> pending_release", async () => {
      const { error } = await vendor.sb.rpc("vendor_mark_complete", { p_escrow_id: txId });
      assertEquals(error, null);
      const { data: tx } = await vendor.sb.from("transactions").select("status").eq("id", txId).single();
      assertEquals(tx!.status, "pending_release");
      const { data: n } = await client.sb.from("notifications").select("id")
        .eq("transaction_id", txId).eq("type", "escrow_pending_release");
      assert((n?.length ?? 0) > 0);
    });

    await t.step("vendor cannot self-release funds", async () => {
      const { error } = await vendor.sb.rpc("release_escrow_funds", { p_escrow_id: txId });
      assert(error !== null);
    });

    await t.step("client releases funds -> vendor wallet credited + completed", async () => {
      const { error } = await client.sb.rpc("release_escrow_funds", { p_escrow_id: txId });
      assertEquals(error, null);
      const { data: tx } = await client.sb.from("transactions").select("status,completed_at").eq("id", txId).single();
      assertEquals(tx!.status, "completed");
      assertExists(tx!.completed_at);
      const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
      assertEquals(Number(vw!.balance), amount);
      const { data: n } = await vendor.sb.from("notifications").select("id")
        .eq("transaction_id", txId).eq("type", "escrow_released");
      assert((n?.length ?? 0) > 0);
    });

    await t.step("timeline contains created/funded/accepted/submitted/completed events", async () => {
      const { data: events } = await client.sb.from("transaction_events")
        .select("event_type").eq("transaction_id", txId);
      const types = (events ?? []).map((e: any) => e.event_type);
      for (const t of ["created", "funded", "accepted", "submitted", "completed"]) {
        assert(types.includes(t), `missing event ${t}`);
      }
    });

    await cleanup(client, vendor, stranger);
  },
});

Deno.test({
  name: "Full E2E: dispute path with evidence uploads + admin partial refund",
  sanitizeOps: false, sanitizeResources: false,
  fn: async (t) => {
    const client = await makeUser("dclient");
    const vendor = await makeUser("dvendor");
    const admin = await makeUser("dadmin");
    const stranger = await makeUser("dstrg");
    await helper("grant_admin", { user_id: admin.id });
    await helper("set_wallet", { user_id: client.id, balance: 200000 });

    const amount = 15000, fee = 225;
    let txId = "", disputeId = "";

    await t.step("set up funded + accepted escrow", async () => {
      const { data: tx } = await client.sb.from("transactions").insert({
        client_id: client.id, vendor_id: vendor.id, title: "Dispute lifecycle",
        description: "Full dispute test", amount, platform_fee: fee, status: "pending_funding",
      }).select().single();
      txId = tx!.id;
      await client.sb.rpc("fund_escrow_from_wallet", { p_escrow_id: txId });
      await vendor.sb.rpc("vendor_accept_escrow", { p_escrow_id: txId });
    });

    await t.step("stranger cannot open dispute on someone else's tx", async () => {
      const { error } = await stranger.sb.rpc("create_dispute", {
        p_transaction_id: txId, p_reason: "quality_issues", p_description: "hax",
      });
      assert(error !== null);
    });

    await t.step("client opens dispute via RPC -> tx status=disputed + vendor notified", async () => {
      const { data, error } = await client.sb.rpc("create_dispute", {
        p_transaction_id: txId, p_reason: "quality_issues",
        p_description: "Delivered work has quality problems.",
      });
      assertEquals(error, null);
      disputeId = (data as any).id;
      assertExists(disputeId);

      const { data: tx } = await client.sb.from("transactions").select("status").eq("id", txId).single();
      assertEquals(tx!.status, "disputed");

      const { data: n } = await vendor.sb.from("notifications").select("id")
        .eq("dispute_id", disputeId).eq("type", "dispute_opened");
      assert((n?.length ?? 0) > 0);
    });

    await t.step("client uploads evidence (storage + dispute_evidence row + log RPC)", async () => {
      const path = `${disputeId}/client-${rand()}.txt`;
      const { error: upErr } = await client.sb.storage.from("dispute-evidence")
        .upload(path, new Blob(["client evidence"], { type: "text/plain" }));
      assertEquals(upErr, null);

      const { error: rowErr } = await client.sb.from("dispute_evidence").insert({
        dispute_id: disputeId, uploaded_by: client.id,
        file_url: path, file_name: "client.txt", file_type: "document",
      });
      assertEquals(rowErr, null);

      const { error: logErr } = await client.sb.rpc("log_dispute_evidence", {
        p_dispute_id: disputeId, p_file_name: "client.txt",
      });
      assertEquals(logErr, null);
    });

    await t.step("stranger blocked from uploading to dispute folder", async () => {
      const { error } = await stranger.sb.storage.from("dispute-evidence")
        .upload(`${disputeId}/hack-${rand()}.txt`, new Blob(["x"]));
      assert(error !== null);
    });

    await t.step("stranger blocked from inserting dispute_evidence row", async () => {
      const { error } = await stranger.sb.from("dispute_evidence").insert({
        dispute_id: disputeId, uploaded_by: stranger.id,
        file_url: "fake", file_name: "fake.txt", file_type: "document",
      });
      assert(error !== null);
    });

    await t.step("vendor uploads evidence then submits response via RPC", async () => {
      const path = `${disputeId}/vendor-${rand()}.txt`;
      const { error: upErr } = await vendor.sb.storage.from("dispute-evidence")
        .upload(path, new Blob(["vendor proof"], { type: "text/plain" }));
      assertEquals(upErr, null);

      await vendor.sb.from("dispute_evidence").insert({
        dispute_id: disputeId, uploaded_by: vendor.id,
        file_url: path, file_name: "vendor.txt", file_type: "document",
      });

      const { error } = await vendor.sb.rpc("vendor_submit_dispute_response", {
        p_dispute_id: disputeId,
        p_response: "Work delivered per spec; see evidence.",
        p_evidence_count: 1,
      });
      assertEquals(error, null);

      const { data } = await client.sb.from("disputes")
        .select("vendor_response,status").eq("id", disputeId).single();
      assertEquals(data!.status, "under_review");
      assertExists(data!.vendor_response);
    });

    await t.step("both parties see both evidence rows; stranger sees none", async () => {
      const { data: ce } = await client.sb.from("dispute_evidence").select("id").eq("dispute_id", disputeId);
      const { data: ve } = await vendor.sb.from("dispute_evidence").select("id").eq("dispute_id", disputeId);
      const { data: se } = await stranger.sb.from("dispute_evidence").select("id").eq("dispute_id", disputeId);
      assertEquals(ce?.length, 2);
      assertEquals(ve?.length, 2);
      assertEquals(se?.length, 0);
    });

    await t.step("non-admin cannot resolve; vendor cannot tamper dispute status", async () => {
      const { error: e1 } = await client.sb.rpc("resolve_dispute", {
        p_dispute_id: disputeId, p_action: "refund_buyer",
      });
      assert(e1 !== null);

      await vendor.sb.from("disputes").update({ status: "resolved" }).eq("id", disputeId);
      const { data } = await client.sb.from("disputes").select("status").eq("id", disputeId).single();
      assertEquals(data!.status, "under_review");
    });

    await t.step("admin resolves with partial refund -> split wallets + tx completed", async () => {
      const partial = 6000;
      const { data: cwBefore } = await client.sb.from("wallets").select("balance").eq("user_id", client.id).single();
      const before = Number(cwBefore!.balance);

      const { error } = await admin.sb.rpc("resolve_dispute", {
        p_dispute_id: disputeId, p_action: "partial_refund", p_partial_amount: partial,
      });
      assertEquals(error, null);

      const { data: cwAfter } = await client.sb.from("wallets").select("balance").eq("user_id", client.id).single();
      assertEquals(Number(cwAfter!.balance) - before, partial);

      const { data: vw } = await vendor.sb.from("wallets").select("balance").eq("user_id", vendor.id).single();
      assertEquals(Number(vw!.balance), amount - partial);

      const { data: d } = await admin.sb.from("disputes").select("status,resolution,resolved_at").eq("id", disputeId).single();
      assertEquals(d!.status, "resolved");
      assertExists(d!.resolved_at);
      assertExists(d!.resolution);

      const { data: tx } = await admin.sb.from("transactions").select("status").eq("id", txId).single();
      assertEquals(tx!.status, "completed");

      // both parties notified
      const { data: cn } = await client.sb.from("notifications").select("id")
        .eq("dispute_id", disputeId).eq("type", "dispute_resolved");
      const { data: vn } = await vendor.sb.from("notifications").select("id")
        .eq("dispute_id", disputeId).eq("type", "dispute_resolved");
      assert((cn?.length ?? 0) > 0);
      assert((vn?.length ?? 0) > 0);
    });

    await t.step("dispute timeline contains opened/evidence/response/resolved events", async () => {
      const { data: events } = await client.sb.from("dispute_events")
        .select("event_type").eq("dispute_id", disputeId);
      const types = (events ?? []).map((e: any) => e.event_type);
      for (const t of ["opened", "evidence", "response", "resolved"]) {
        assert(types.includes(t), `missing dispute event ${t}`);
      }
    });

    await cleanup(client, vendor, admin, stranger);
  },
});

// Test helper edge function — uses service role to create/cleanup ephemeral
// test users and seed wallet balances for RLS tests. Only used by automated tests.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_user") {
      const { email, password, full_name } = body;
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name },
      });
      if (error) throw error;
      return json({ user_id: data.user!.id });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      await admin.auth.admin.deleteUser(user_id).catch(() => {});
      return json({ ok: true });
    }

    if (action === "set_wallet") {
      const { user_id, balance } = body;
      const { data: existing } = await admin.from("wallets").select("id").eq("user_id", user_id).maybeSingle();
      if (existing) {
        await admin.from("wallets").update({ balance }).eq("id", existing.id);
      } else {
        await admin.from("wallets").insert({ user_id, balance });
      }
      return json({ ok: true });
    }

    if (action === "seed_notification") {
      const { user_id, type, title, message } = body;
      const { data, error } = await admin.from("notifications")
        .insert({ user_id, type, title, message })
        .select().single();
      if (error) throw error;
      return json({ id: data.id });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

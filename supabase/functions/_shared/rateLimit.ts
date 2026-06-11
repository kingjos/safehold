// Shared rate-limit helper for edge functions.
// Calls the public.check_rate_limit RPC (atomic fixed-window counter) using the service role.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitRule {
  /** Limit name, used as the counter key prefix (e.g. "paystack-initialize"). */
  name: string;
  /** Max requests per user_id in the window. Set 0 to skip. */
  perUser: number;
  /** Max requests per IP in the window. Set 0 to skip. */
  perIp: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  scope?: "user" | "ip";
  resetInSeconds?: number;
}

let cachedAdmin: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  return cachedAdmin;
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

async function check(key: string, max: number, windowSeconds: number) {
  const { data, error } = await admin().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate-limit RPC failed; failing open:", error.message);
    return { allowed: true, reset_in_seconds: 0 };
  }
  return data as { allowed: boolean; reset_in_seconds: number };
}

export async function enforceRateLimit(
  rule: RateLimitRule,
  opts: { userId?: string | null; ip?: string | null },
): Promise<RateLimitDecision> {
  // Per-user check first (cheaper to attribute).
  if (rule.perUser > 0 && opts.userId) {
    const res = await check(`${rule.name}:user:${opts.userId}`, rule.perUser, rule.windowSeconds);
    if (!res.allowed) return { allowed: false, scope: "user", resetInSeconds: res.reset_in_seconds };
  }
  if (rule.perIp > 0 && opts.ip && opts.ip !== "unknown") {
    const res = await check(`${rule.name}:ip:${opts.ip}`, rule.perIp, rule.windowSeconds);
    if (!res.allowed) return { allowed: false, scope: "ip", resetInSeconds: res.reset_in_seconds };
  }
  return { allowed: true };
}

export function tooManyRequests(
  decision: RateLimitDecision,
  corsHeaders: Record<string, string>,
): Response {
  const retry = decision.resetInSeconds ?? 60;
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down.",
      scope: decision.scope,
      retry_after_seconds: retry,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retry),
      },
    },
  );
}

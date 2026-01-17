import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    
    if (!reference) {
      return new Response(JSON.stringify({ error: "Reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user matches
    if (data.data.metadata?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "User mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInNaira = data.data.amount / 100;

    // Get or create wallet
    let { data: wallet } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!wallet) {
      const { data: newWallet } = await supabaseClient
        .from("wallets")
        .insert({ user_id: user.id })
        .select()
        .single();
      wallet = newWallet;
    }

    // Check if this reference was already processed
    const { data: existingTx } = await supabaseClient
      .from("wallet_transactions")
      .select("id")
      .eq("reference", reference)
      .single();

    if (existingTx) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        amount: amountInNaira 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update wallet balance
    const newBalance = (wallet?.balance || 0) + amountInNaira;
    
    await supabaseClient
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    // Create transaction record
    await supabaseClient.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: user.id,
      type: "deposit",
      amount: amountInNaira,
      balance_after: newBalance,
      description: "Paystack Wallet Funding",
      reference,
      status: "completed",
    });

    return new Response(JSON.stringify({
      success: true,
      amount: amountInNaira,
      new_balance: newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// Verify Paystack webhook signature using Web Crypto API
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Missing Paystack signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const isValid = await verifySignature(body, signature, paystackSecretKey);
    if (!isValid) {
      console.error("Invalid Paystack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event, "Reference:", event.data?.reference);

    // Only process successful charge events
    if (event.event !== "charge.success") {
      console.log("Ignoring non-charge event:", event.event);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentData = event.data;
    
    // Verify this is a wallet funding transaction
    if (paymentData.metadata?.type !== "wallet_funding") {
      console.log("Ignoring non-wallet transaction");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = paymentData.metadata?.user_id;
    const reference = paymentData.reference;
    const amountInNaira = paymentData.amount / 100;

    if (!userId || !reference) {
      console.error("Missing user_id or reference in metadata");
      return new Response(JSON.stringify({ error: "Invalid metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing wallet funding: User ${userId}, Amount ₦${amountInNaira}, Ref: ${reference}`);

    // Use service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if this reference was already processed
    const { data: existingTx } = await supabaseClient
      .from("wallet_transactions")
      .select("id")
      .eq("reference", reference)
      .single();

    if (existingTx) {
      console.log("Transaction already processed:", reference);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create wallet
    let { data: wallet } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!wallet) {
      console.log("Creating wallet for user:", userId);
      const { data: newWallet, error: walletError } = await supabaseClient
        .from("wallets")
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (walletError) {
        console.error("Error creating wallet:", walletError);
        throw walletError;
      }
      wallet = newWallet;
    }

    // Update wallet balance
    const newBalance = (wallet?.balance || 0) + amountInNaira;
    
    const { error: updateError } = await supabaseClient
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      throw updateError;
    }

    // Create transaction record
    const { error: txError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: userId,
        type: "deposit",
        amount: amountInNaira,
        balance_after: newBalance,
        description: "Paystack Wallet Funding (Webhook)",
        reference,
        status: "completed",
      });

    if (txError) {
      console.error("Error creating transaction record:", txError);
      throw txError;
    }

    // Create notification for user
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: userId,
        type: "wallet",
        title: "Wallet Funded",
        message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()}`,
      });

    console.log(`Successfully processed wallet funding: User ${userId}, New balance: ₦${newBalance}`);

    return new Response(JSON.stringify({ 
      received: true, 
      processed: true,
      amount: amountInNaira,
      new_balance: newBalance 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

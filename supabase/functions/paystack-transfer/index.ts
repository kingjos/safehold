import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map common Nigerian bank names to Paystack bank codes
const BANK_CODES: Record<string, string> = {
  "access bank": "044",
  "citibank": "023",
  "diamond bank": "063",
  "ecobank": "050",
  "fidelity bank": "070",
  "first bank": "011",
  "first bank of nigeria": "011",
  "first city monument bank": "214",
  "fcmb": "214",
  "guaranty trust bank": "058",
  "gtbank": "058",
  "gtb": "058",
  "heritage bank": "030",
  "jaiz bank": "301",
  "keystone bank": "082",
  "kuda bank": "50211",
  "kuda": "50211",
  "opay": "999992",
  "palmpay": "999991",
  "polaris bank": "076",
  "providus bank": "101",
  "stanbic ibtc bank": "221",
  "stanbic ibtc": "221",
  "standard chartered bank": "068",
  "sterling bank": "232",
  "suntrust bank": "100",
  "titan trust bank": "102",
  "union bank": "032",
  "union bank of nigeria": "032",
  "united bank for africa": "033",
  "uba": "033",
  "unity bank": "215",
  "vfd microfinance bank": "566",
  "wema bank": "035",
  "zenith bank": "057",
  "moniepoint": "50515",
};

function getBankCode(bankName: string): string | null {
  const normalized = bankName.toLowerCase().trim();
  return BANK_CODES[normalized] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { amount, bank_account_id } = await req.json();

    if (!amount || amount < 1000) {
      return new Response(
        JSON.stringify({ error: "Minimum withdrawal is ₦1,000" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bank_account_id) {
      return new Response(
        JSON.stringify({ error: "Bank account is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for DB operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get bank account (verify ownership)
    const { data: bankAccount, error: bankError } = await adminClient
      .from("bank_accounts")
      .select("*")
      .eq("id", bank_account_id)
      .eq("user_id", userId)
      .single();

    if (bankError || !bankAccount) {
      return new Response(
        JSON.stringify({ error: "Bank account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve bank code
    const bankCode = getBankCode(bankAccount.bank_name);
    if (!bankCode) {
      return new Response(
        JSON.stringify({
          error: `Unable to resolve bank code for "${bankAccount.bank_name}". Please update your bank name to match a supported Nigerian bank.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fee = 50;
    const totalDeduction = amount + fee;

    // Get wallet and check balance
    const { data: wallet, error: walletError } = await adminClient
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: "Wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (wallet.balance < totalDeduction) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create or reuse transfer recipient
    let recipientCode = bankAccount.paystack_recipient_code;

    if (!recipientCode) {
      console.log("Creating Paystack transfer recipient...");
      const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: bankAccount.account_name,
          account_number: bankAccount.account_number,
          bank_code: bankCode,
          currency: "NGN",
        }),
      });

      const recipientData = await recipientRes.json();

      if (!recipientData.status) {
        console.error("Paystack create recipient error:", recipientData);
        return new Response(
          JSON.stringify({ error: recipientData.message || "Failed to create transfer recipient" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipientCode = recipientData.data.recipient_code;

      // Cache the recipient code
      await adminClient
        .from("bank_accounts")
        .update({ paystack_recipient_code: recipientCode })
        .eq("id", bank_account_id);
    }

    // Step 2: Deduct from wallet
    const newBalance = wallet.balance - totalDeduction;
    await adminClient
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    // Step 3: Create pending wallet transaction
    const transferRef = `WD-${Date.now()}-${userId.substring(0, 8)}`;

    const { data: walletTx, error: txError } = await adminClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: userId,
        type: "withdrawal",
        amount: totalDeduction,
        balance_after: newBalance,
        description: `Bank Withdrawal to ${bankAccount.bank_name} - ${bankAccount.account_number}`,
        reference: transferRef,
        status: "pending",
        transfer_reference: null, // will be updated after Paystack responds
      })
      .select()
      .single();

    if (txError) {
      // Rollback wallet balance
      await adminClient
        .from("wallets")
        .update({ balance: wallet.balance })
        .eq("id", wallet.id);

      console.error("Error creating transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Initiate Paystack transfer
    console.log("Initiating Paystack transfer...");
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amount * 100, // Paystack uses kobo
        recipient: recipientCode,
        reason: `SafeHold withdrawal - ${transferRef}`,
        reference: transferRef,
        metadata: {
          type: "wallet_withdrawal",
          user_id: userId,
          wallet_transaction_id: walletTx.id,
        },
      }),
    });

    const transferData = await transferRes.json();

    if (!transferData.status) {
      // Rollback: restore balance and mark transaction failed
      await adminClient
        .from("wallets")
        .update({ balance: wallet.balance })
        .eq("id", wallet.id);

      await adminClient
        .from("wallet_transactions")
        .update({ status: "failed" })
        .eq("id", walletTx.id);

      console.error("Paystack transfer error:", transferData);
      return new Response(
        JSON.stringify({ error: transferData.message || "Transfer failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with Paystack transfer reference
    const paystackTransferCode = transferData.data.transfer_code;
    await adminClient
      .from("wallet_transactions")
      .update({ transfer_reference: paystackTransferCode })
      .eq("id", walletTx.id);

    // Create notification
    await adminClient.from("notifications").insert({
      user_id: userId,
      type: "wallet",
      title: "Withdrawal Processing",
      message: `Your withdrawal of ₦${amount.toLocaleString()} to ${bankAccount.bank_name} is being processed.`,
    });

    console.log(`Transfer initiated: ${paystackTransferCode} for ₦${amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: paystackTransferCode,
        reference: transferRef,
        amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Transfer error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

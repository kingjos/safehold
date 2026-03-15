ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS paystack_recipient_code text DEFAULT NULL;

-- Add a transfer_reference column to wallet_transactions for tracking Paystack transfers
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS transfer_reference text DEFAULT NULL;
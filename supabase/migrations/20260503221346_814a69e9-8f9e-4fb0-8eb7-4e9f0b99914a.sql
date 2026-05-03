
-- Tighten wallets INSERT
DROP POLICY IF EXISTS "System can create wallets" ON public.wallets;
CREATE POLICY "Users can create their own wallet"
ON public.wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tighten wallet_transactions INSERT (handled exclusively by SECURITY DEFINER functions)
DROP POLICY IF EXISTS "System can create wallet transactions" ON public.wallet_transactions;

-- Allow transaction parties to record their own events
CREATE POLICY "Transaction parties can add events"
ON public.transaction_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_events.transaction_id
      AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

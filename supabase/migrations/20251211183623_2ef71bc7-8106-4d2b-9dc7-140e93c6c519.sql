-- Add policy for transaction parties to view counterparty profiles
-- This ensures users can only see profiles of people they have transactions with
CREATE POLICY "Transaction parties can view counterparty profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE (
      (t.client_id = auth.uid() AND t.vendor_id = profiles.user_id)
      OR
      (t.vendor_id = auth.uid() AND t.client_id = profiles.user_id)
    )
  )
);
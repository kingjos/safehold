
-- Notifications should not be insertable by arbitrary clients
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Lock down anon execute on internal functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fund_wallet(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_wallet(numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.withdraw_wallet(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_wallet(numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fund_escrow_from_wallet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_escrow_from_wallet(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.release_escrow_funds(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow_funds(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_transaction_counterparty_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_transaction_counterparty_profile(uuid) TO authenticated;

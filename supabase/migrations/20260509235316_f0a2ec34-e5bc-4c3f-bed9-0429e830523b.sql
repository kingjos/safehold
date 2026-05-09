
CREATE OR REPLACE FUNCTION public.vendor_decline_escrow(p_escrow_id uuid, p_reason text DEFAULT NULL)
 RETURNS public.transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
  v_client_wallet public.wallets;
  v_refund NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can decline this escrow';
  END IF;
  IF v_escrow.status NOT IN ('funded','pending_funding') THEN
    RAISE EXCEPTION 'Escrow can only be declined before work starts (current: %)', v_escrow.status;
  END IF;

  IF v_escrow.status = 'funded' THEN
    v_refund := v_escrow.amount + v_escrow.platform_fee;

    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_escrow.client_id;
    IF v_client_wallet IS NULL THEN
      INSERT INTO public.wallets (user_id) VALUES (v_escrow.client_id) RETURNING * INTO v_client_wallet;
    END IF;

    UPDATE public.wallets SET balance = balance + v_refund
    WHERE id = v_client_wallet.id RETURNING * INTO v_client_wallet;

    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
    ) VALUES (
      v_client_wallet.id, v_escrow.client_id, 'refund', v_refund, v_client_wallet.balance,
      'Escrow Refund (vendor declined): ' || v_escrow.title, p_escrow_id, 'completed'
    );
  END IF;

  UPDATE public.transactions
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_escrow_id
  RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'declined',
    COALESCE('Vendor declined the escrow: ' || p_reason, 'Vendor declined the escrow'));

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_declined', 'Escrow Declined',
    'The vendor declined "' || v_escrow.title || '"' ||
    CASE WHEN v_refund IS NOT NULL THEN '. Funds refunded to your wallet.' ELSE '.' END,
    p_escrow_id);

  RETURN v_escrow;
END;
$function$;

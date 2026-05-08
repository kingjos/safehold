
CREATE OR REPLACE FUNCTION public.client_cancel_pending_escrow(p_escrow_id uuid)
 RETURNS public.transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.client_id != auth.uid() THEN RAISE EXCEPTION 'Only the client can cancel this escrow'; END IF;
  IF v_escrow.status != 'pending_funding' THEN
    RAISE EXCEPTION 'Only unfunded escrows can be cancelled this way (current: %)', v_escrow.status;
  END IF;

  UPDATE public.transactions SET status = 'cancelled', updated_at = now()
  WHERE id = p_escrow_id RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'cancelled', 'Client cancelled the escrow before funding');

  IF v_escrow.vendor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
    VALUES (v_escrow.vendor_id, 'escrow_cancelled', 'Escrow Cancelled',
      'The client cancelled the escrow "' || v_escrow.title || '" before funding.', p_escrow_id);
  END IF;

  RETURN v_escrow;
END;
$function$;

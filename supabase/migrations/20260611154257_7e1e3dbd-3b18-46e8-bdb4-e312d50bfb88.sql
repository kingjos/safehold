
-- Add row-level locking (SELECT ... FOR UPDATE) to all status-mutating RPCs so
-- concurrent calls serialize and exactly one wins. Logic is otherwise unchanged.

CREATE OR REPLACE FUNCTION public.release_escrow_funds(p_escrow_id uuid)
 RETURNS wallet_transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.client_id != auth.uid() THEN RAISE EXCEPTION 'Only the client can release funds'; END IF;
  IF v_escrow.status NOT IN ('pending_release', 'in_progress', 'funded') THEN
    RAISE EXCEPTION 'Escrow cannot be released in current status';
  END IF;
  IF v_escrow.vendor_id IS NULL THEN RAISE EXCEPTION 'No vendor assigned to this escrow'; END IF;

  SELECT * INTO v_vendor_wallet FROM public.wallets WHERE user_id = v_escrow.vendor_id FOR UPDATE;
  IF v_vendor_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_escrow.vendor_id) RETURNING * INTO v_vendor_wallet;
  END IF;

  UPDATE public.wallets SET balance = balance + v_escrow.amount
  WHERE id = v_vendor_wallet.id RETURNING * INTO v_vendor_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_vendor_wallet.id, v_escrow.vendor_id, 'escrow_release', v_escrow.amount, v_vendor_wallet.balance,
    'Escrow Payment: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;

  UPDATE public.transactions SET status = 'completed', completed_at = now() WHERE id = p_escrow_id;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'completed', 'Client released funds to vendor');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.vendor_id, 'escrow_released', 'Funds Released',
    'Funds for "' || v_escrow.title || '" have been released to your wallet.', p_escrow_id);

  RETURN v_transaction;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_accept_escrow(p_escrow_id uuid)
 RETURNS transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can accept this escrow';
  END IF;
  IF v_escrow.status != 'funded' THEN
    RAISE EXCEPTION 'Escrow must be funded before acceptance (current: %)', v_escrow.status;
  END IF;

  UPDATE public.transactions
  SET status = 'in_progress', started_at = now(), updated_at = now()
  WHERE id = p_escrow_id RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'accepted', 'Vendor accepted the escrow and started work');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_accepted', 'Escrow Accepted',
    'The vendor accepted "' || v_escrow.title || '" and started work.', p_escrow_id);

  RETURN v_escrow;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_mark_complete(p_escrow_id uuid)
 RETURNS transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can mark this escrow complete';
  END IF;
  IF v_escrow.status != 'in_progress' THEN
    RAISE EXCEPTION 'Escrow must be in progress (current: %)', v_escrow.status;
  END IF;

  UPDATE public.transactions
  SET status = 'pending_release', updated_at = now()
  WHERE id = p_escrow_id RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'submitted', 'Vendor marked the work as complete and requested release');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_pending_release', 'Work Submitted for Release',
    'The vendor submitted "' || v_escrow.title || '" for release. Please review and release funds.',
    p_escrow_id);

  RETURN v_escrow;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_decline_escrow(p_escrow_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
  v_client_wallet public.wallets;
  v_refund NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can decline this escrow';
  END IF;
  IF v_escrow.status NOT IN ('funded','pending_funding') THEN
    RAISE EXCEPTION 'Escrow can only be declined before work starts (current: %)', v_escrow.status;
  END IF;

  IF v_escrow.status = 'funded' THEN
    v_refund := v_escrow.amount + v_escrow.platform_fee;

    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_escrow.client_id FOR UPDATE;
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
  WHERE id = p_escrow_id RETURNING * INTO v_escrow;

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

CREATE OR REPLACE FUNCTION public.client_cancel_pending_escrow(p_escrow_id uuid)
 RETURNS transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
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

CREATE OR REPLACE FUNCTION public.fund_escrow_from_wallet(p_escrow_id uuid)
 RETURNS wallet_transactions
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
  v_total NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.client_id != auth.uid() THEN RAISE EXCEPTION 'Only the client can fund this escrow'; END IF;
  IF v_escrow.status != 'pending_funding' THEN RAISE EXCEPTION 'Escrow is not pending funding'; END IF;

  v_total := v_escrow.amount + v_escrow.platform_fee;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF v_wallet IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.balance < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_total, v_wallet.balance;
  END IF;

  UPDATE public.wallets SET balance = balance - v_total WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_wallet.id, auth.uid(), 'escrow_fund', v_total, v_wallet.balance,
    'Escrow Funding: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;

  UPDATE public.transactions SET status = 'funded', funded_at = now() WHERE id = p_escrow_id;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'funded', 'Client funded the escrow from wallet');

  IF v_escrow.vendor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
    VALUES (
      v_escrow.vendor_id, 'escrow_funded', 'New Escrow Funded',
      'An escrow for "' || v_escrow.title || '" has been funded. Please review and accept.',
      p_escrow_id
    );
  END IF;

  RETURN v_transaction;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute_id uuid, p_action text, p_partial_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute public.disputes;
  v_escrow public.transactions;
  v_client_wallet public.wallets;
  v_vendor_wallet public.wallets;
  v_refund_amount numeric;
  v_vendor_amount numeric;
  v_resolution_type text;
  v_resolution_desc text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;

  -- Lock the dispute row to serialize concurrent resolutions.
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF v_dispute IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  IF v_dispute.status IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Dispute is already resolved';
  END IF;

  SELECT * INTO v_escrow FROM public.transactions WHERE id = v_dispute.transaction_id FOR UPDATE;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Related transaction not found'; END IF;

  SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_escrow.client_id FOR UPDATE;
  IF v_client_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_escrow.client_id) RETURNING * INTO v_client_wallet;
  END IF;

  IF v_escrow.vendor_id IS NOT NULL THEN
    SELECT * INTO v_vendor_wallet FROM public.wallets WHERE user_id = v_escrow.vendor_id FOR UPDATE;
    IF v_vendor_wallet IS NULL THEN
      INSERT INTO public.wallets (user_id) VALUES (v_escrow.vendor_id) RETURNING * INTO v_vendor_wallet;
    END IF;
  END IF;

  IF p_action = 'refund_buyer' THEN
    v_refund_amount := v_escrow.amount; v_vendor_amount := 0;
    v_resolution_type := 'refund_client';
    v_resolution_desc := 'Full refund issued to buyer.';
  ELSIF p_action = 'release_vendor' THEN
    v_refund_amount := 0; v_vendor_amount := v_escrow.amount;
    v_resolution_type := 'pay_vendor';
    v_resolution_desc := 'Full payment released to vendor.';
  ELSIF p_action = 'partial_refund' THEN
    IF p_partial_amount IS NULL OR p_partial_amount <= 0 OR p_partial_amount > v_escrow.amount THEN
      RAISE EXCEPTION 'Invalid partial refund amount';
    END IF;
    v_refund_amount := p_partial_amount;
    v_vendor_amount := v_escrow.amount - p_partial_amount;
    v_resolution_type := 'partial_refund';
    v_resolution_desc := 'Partial refund of ' || p_partial_amount || ' issued to buyer. Remaining ' || v_vendor_amount || ' released to vendor.';
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  IF v_refund_amount > 0 THEN
    UPDATE public.wallets SET balance = balance + v_refund_amount WHERE id = v_client_wallet.id
    RETURNING * INTO v_client_wallet;
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, escrow_id, status)
    VALUES (v_client_wallet.id, v_escrow.client_id, 'dispute_refund', v_refund_amount, v_client_wallet.balance,
      'Dispute Refund: ' || v_escrow.title, v_escrow.id, 'completed');
  END IF;

  IF v_vendor_amount > 0 AND v_escrow.vendor_id IS NOT NULL THEN
    UPDATE public.wallets SET balance = balance + v_vendor_amount WHERE id = v_vendor_wallet.id
    RETURNING * INTO v_vendor_wallet;
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, escrow_id, status)
    VALUES (v_vendor_wallet.id, v_escrow.vendor_id, 'dispute_release', v_vendor_amount, v_vendor_wallet.balance,
      'Dispute Release: ' || v_escrow.title, v_escrow.id, 'completed');
  END IF;

  UPDATE public.disputes
  SET status = 'resolved',
      resolution = json_build_object(
        'type', v_resolution_type, 'description', v_resolution_desc,
        'resolvedBy', auth.uid(), 'resolvedAt', now(), 'amount', v_refund_amount
      )::text,
      resolved_at = now(), updated_at = now()
  WHERE id = p_dispute_id;

  UPDATE public.transactions
  SET status = CASE
    WHEN p_action = 'refund_buyer' THEN 'refunded'
    WHEN p_action = 'release_vendor' THEN 'completed'
    ELSE 'completed' END::escrow_status,
  completed_at = now(), updated_at = now()
  WHERE id = v_dispute.transaction_id;

  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (p_dispute_id, auth.uid(), 'resolved', v_resolution_desc);

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (v_dispute.transaction_id, auth.uid(), 'dispute_resolved', 'Dispute resolved: ' || v_resolution_desc);

  INSERT INTO public.notifications (user_id, type, title, message, dispute_id, transaction_id)
  VALUES
    (v_escrow.client_id, 'dispute_resolved', 'Dispute Resolved', v_resolution_desc, p_dispute_id, v_dispute.transaction_id),
    (v_escrow.vendor_id, 'dispute_resolved', 'Dispute Resolved', v_resolution_desc, p_dispute_id, v_dispute.transaction_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_submit_dispute_response(p_dispute_id uuid, p_response text, p_evidence_count integer DEFAULT 0)
 RETURNS disputes
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_dispute public.disputes;
  v_tx public.transactions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id FOR UPDATE;
  IF v_dispute IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = v_dispute.transaction_id;
  IF v_tx.vendor_id IS NULL OR v_tx.vendor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can respond to this dispute';
  END IF;
  IF v_dispute.status IN ('resolved','closed') THEN
    RAISE EXCEPTION 'Dispute is already closed';
  END IF;

  PERFORM set_config('app.bypass_dispute_guard', 'on', true);

  UPDATE public.disputes
  SET vendor_response = p_response, status = 'under_review', updated_at = now()
  WHERE id = p_dispute_id RETURNING * INTO v_dispute;

  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (p_dispute_id, auth.uid(), 'response',
    'Vendor responded to the dispute' ||
    CASE WHEN p_evidence_count > 0
         THEN ' and uploaded ' || p_evidence_count || ' evidence file(s)'
         ELSE '' END);

  RETURN v_dispute;
END;
$function$;

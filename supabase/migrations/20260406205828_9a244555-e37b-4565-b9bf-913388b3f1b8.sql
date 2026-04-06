
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid,
  p_action text,
  p_partial_amount numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;

  -- Get dispute
  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;
  IF v_dispute IS NULL THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  IF v_dispute.status IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Dispute is already resolved';
  END IF;

  -- Get related escrow transaction
  SELECT * INTO v_escrow FROM public.transactions WHERE id = v_dispute.transaction_id;
  IF v_escrow IS NULL THEN
    RAISE EXCEPTION 'Related transaction not found';
  END IF;

  -- Get or create wallets
  SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_escrow.client_id;
  IF v_client_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_escrow.client_id) RETURNING * INTO v_client_wallet;
  END IF;

  IF v_escrow.vendor_id IS NOT NULL THEN
    SELECT * INTO v_vendor_wallet FROM public.wallets WHERE user_id = v_escrow.vendor_id;
    IF v_vendor_wallet IS NULL THEN
      INSERT INTO public.wallets (user_id) VALUES (v_escrow.vendor_id) RETURNING * INTO v_vendor_wallet;
    END IF;
  END IF;

  -- Determine amounts based on action
  IF p_action = 'refund_buyer' THEN
    v_refund_amount := v_escrow.amount;
    v_vendor_amount := 0;
    v_resolution_type := 'refund_client';
    v_resolution_desc := 'Full refund issued to buyer.';
  ELSIF p_action = 'release_vendor' THEN
    v_refund_amount := 0;
    v_vendor_amount := v_escrow.amount;
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

  -- Credit client wallet if refund
  IF v_refund_amount > 0 THEN
    UPDATE public.wallets SET balance = balance + v_refund_amount WHERE id = v_client_wallet.id
    RETURNING * INTO v_client_wallet;

    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, escrow_id, status)
    VALUES (v_client_wallet.id, v_escrow.client_id, 'dispute_refund', v_refund_amount, v_client_wallet.balance,
      'Dispute Refund: ' || v_escrow.title, v_escrow.id, 'completed');
  END IF;

  -- Credit vendor wallet if releasing
  IF v_vendor_amount > 0 AND v_escrow.vendor_id IS NOT NULL THEN
    UPDATE public.wallets SET balance = balance + v_vendor_amount WHERE id = v_vendor_wallet.id
    RETURNING * INTO v_vendor_wallet;

    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, escrow_id, status)
    VALUES (v_vendor_wallet.id, v_escrow.vendor_id, 'dispute_release', v_vendor_amount, v_vendor_wallet.balance,
      'Dispute Release: ' || v_escrow.title, v_escrow.id, 'completed');
  END IF;

  -- Update dispute
  UPDATE public.disputes
  SET status = 'resolved',
      resolution = json_build_object(
        'type', v_resolution_type,
        'description', v_resolution_desc,
        'resolvedBy', auth.uid(),
        'resolvedAt', now(),
        'amount', v_refund_amount
      )::text,
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_dispute_id;

  -- Update transaction status
  UPDATE public.transactions
  SET status = CASE
    WHEN p_action = 'refund_buyer' THEN 'refunded'
    WHEN p_action = 'release_vendor' THEN 'completed'
    ELSE 'completed'
  END::escrow_status,
  completed_at = now(),
  updated_at = now()
  WHERE id = v_dispute.transaction_id;

  -- Add dispute event
  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (p_dispute_id, auth.uid(), 'resolved', v_resolution_desc);

  -- Add transaction event
  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (v_dispute.transaction_id, auth.uid(), 'dispute_resolved', 'Dispute resolved: ' || v_resolution_desc);

  -- Notify both parties
  INSERT INTO public.notifications (user_id, type, title, message, dispute_id, transaction_id)
  VALUES
    (v_escrow.client_id, 'dispute_resolved', 'Dispute Resolved', v_resolution_desc, p_dispute_id, v_dispute.transaction_id),
    (v_escrow.vendor_id, 'dispute_resolved', 'Dispute Resolved', v_resolution_desc, p_dispute_id, v_dispute.transaction_id);
END;
$$;

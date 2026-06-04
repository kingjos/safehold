-- ============================================================
-- Lock down direct writes; route all mutations through RPCs
-- ============================================================

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Clients can update non-status fields" ON public.transactions;
DROP POLICY IF EXISTS "Vendors can update non-status fields" ON public.transactions;
DROP POLICY IF EXISTS "Dispute parties can insert events" ON public.dispute_events;
DROP POLICY IF EXISTS "Transaction parties can add events" ON public.transaction_events;
DROP POLICY IF EXISTS "Vendors can submit response to disputes" ON public.disputes;

CREATE OR REPLACE FUNCTION public.create_dispute(
  p_transaction_id uuid,
  p_reason public.dispute_reason,
  p_description text
) RETURNS public.disputes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tx public.transactions;
  v_dispute public.disputes;
  v_counterparty uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id;
  IF v_tx IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF auth.uid() NOT IN (v_tx.client_id, COALESCE(v_tx.vendor_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Only transaction parties can open disputes';
  END IF;
  IF v_tx.status NOT IN ('funded','in_progress','pending_release') THEN
    RAISE EXCEPTION 'Cannot dispute in current status: %', v_tx.status;
  END IF;

  INSERT INTO public.disputes (transaction_id, opened_by, reason, description)
  VALUES (p_transaction_id, auth.uid(), p_reason, p_description)
  RETURNING * INTO v_dispute;

  UPDATE public.transactions SET status = 'disputed', updated_at = now()
  WHERE id = p_transaction_id;

  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (v_dispute.id, auth.uid(), 'opened', 'Dispute opened');

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_transaction_id, auth.uid(), 'disputed', 'A dispute was raised on this transaction');

  v_counterparty := CASE WHEN auth.uid() = v_tx.client_id THEN v_tx.vendor_id ELSE v_tx.client_id END;
  IF v_counterparty IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, dispute_id, transaction_id)
    VALUES (v_counterparty, 'dispute_opened', 'Dispute Opened',
            'A dispute has been raised on "' || v_tx.title || '"', v_dispute.id, p_transaction_id);
  END IF;

  RETURN v_dispute;
END; $$;

CREATE OR REPLACE FUNCTION public.vendor_submit_dispute_response(
  p_dispute_id uuid,
  p_response text,
  p_evidence_count int DEFAULT 0
) RETURNS public.disputes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dispute public.disputes;
  v_tx public.transactions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id;
  IF v_dispute IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = v_dispute.transaction_id;
  IF v_tx.vendor_id IS NULL OR v_tx.vendor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can respond to this dispute';
  END IF;
  IF v_dispute.status IN ('resolved','closed') THEN
    RAISE EXCEPTION 'Dispute is already closed';
  END IF;

  UPDATE public.disputes
  SET vendor_response = p_response,
      status = 'under_review',
      updated_at = now()
  WHERE id = p_dispute_id
  RETURNING * INTO v_dispute;

  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (p_dispute_id, auth.uid(), 'response',
    'Vendor responded to the dispute' ||
    CASE WHEN p_evidence_count > 0
         THEN ' and uploaded ' || p_evidence_count || ' evidence file(s)'
         ELSE '' END);

  RETURN v_dispute;
END; $$;

CREATE OR REPLACE FUNCTION public.log_dispute_evidence(
  p_dispute_id uuid,
  p_file_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_dispute_party(auth.uid(), p_dispute_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.dispute_events (dispute_id, user_id, event_type, description)
  VALUES (p_dispute_id, auth.uid(), 'evidence',
          'Uploaded evidence: ' || COALESCE(p_file_name, 'file'));
END; $$;

CREATE OR REPLACE FUNCTION public.log_transaction_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (NEW.id, NEW.client_id, 'created', 'Escrow transaction created');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_transaction_created ON public.transactions;
CREATE TRIGGER trg_log_transaction_created
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_transaction_created();

GRANT EXECUTE ON FUNCTION public.create_dispute(uuid, public.dispute_reason, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_submit_dispute_response(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_dispute_evidence(uuid, text) TO authenticated;
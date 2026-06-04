-- Allow trusted SECURITY DEFINER RPCs to bypass the dispute-tampering guard
-- via a request-local GUC. Non-admin callers without the bypass flag are still
-- blocked from modifying status/resolution/core fields.
CREATE OR REPLACE FUNCTION public.guard_dispute_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     OR auth.uid() IS NULL
     OR current_setting('app.bypass_dispute_guard', true) = 'on'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.resolution IS DISTINCT FROM OLD.resolution
     OR NEW.opened_by IS DISTINCT FROM OLD.opened_by
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
  THEN
    RAISE EXCEPTION 'Only admins can modify dispute status, resolution, or core fields';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create the vendor response RPC with the bypass flag set inside the txn.
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

  PERFORM set_config('app.bypass_dispute_guard', 'on', true);

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
END;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_submit_dispute_response(uuid, text, int) TO authenticated;
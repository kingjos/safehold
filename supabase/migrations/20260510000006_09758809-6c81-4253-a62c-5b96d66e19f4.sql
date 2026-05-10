
DROP POLICY IF EXISTS "Vendors can submit response to disputes" ON public.disputes;

CREATE POLICY "Vendors can submit response to disputes"
ON public.disputes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = disputes.transaction_id AND t.vendor_id = auth.uid()
  )
  AND status IN ('open','under_review','awaiting_response')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = disputes.transaction_id AND t.vendor_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.guard_dispute_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (and SECURITY DEFINER routines using superuser/service_role) bypass
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
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

DROP TRIGGER IF EXISTS guard_dispute_update_trg ON public.disputes;
CREATE TRIGGER guard_dispute_update_trg
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.guard_dispute_update();

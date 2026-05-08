
CREATE OR REPLACE FUNCTION public.is_dispute_party(_user_id uuid, _dispute_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.disputes d
    LEFT JOIN public.transactions t ON t.id = d.transaction_id
    WHERE d.id = _dispute_id
      AND (d.opened_by = _user_id OR t.client_id = _user_id OR t.vendor_id = _user_id)
  )
$$;

DROP POLICY IF EXISTS "Authenticated users can view dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Dispute parties can read dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Dispute parties can upload dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage dispute evidence" ON storage.objects;

CREATE POLICY "Dispute parties can read dispute evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND public.is_dispute_party(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Dispute parties can upload dispute evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND public.is_dispute_party(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Admins can manage dispute evidence"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'dispute-evidence' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'dispute-evidence' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Vendors can update disputes on their transactions" ON public.disputes;

CREATE POLICY "Vendors can submit response to disputes"
ON public.disputes
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = disputes.transaction_id AND t.vendor_id = auth.uid())
  AND status IN ('open','under_review','awaiting_response')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = disputes.transaction_id AND t.vendor_id = auth.uid())
  AND status = (SELECT status FROM public.disputes WHERE id = disputes.id)
  AND resolution IS NOT DISTINCT FROM (SELECT resolution FROM public.disputes WHERE id = disputes.id)
  AND opened_by = (SELECT opened_by FROM public.disputes WHERE id = disputes.id)
  AND transaction_id = (SELECT transaction_id FROM public.disputes WHERE id = disputes.id)
  AND reason = (SELECT reason FROM public.disputes WHERE id = disputes.id)
  AND description = (SELECT description FROM public.disputes WHERE id = disputes.id)
  AND resolved_at IS NOT DISTINCT FROM (SELECT resolved_at FROM public.disputes WHERE id = disputes.id)
);

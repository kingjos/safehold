CREATE TABLE public.evidence_download_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dispute_id uuid NOT NULL,
  evidence_id uuid,
  file_path text,
  action text NOT NULL DEFAULT 'download',
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_eda_dispute ON public.evidence_download_audit (dispute_id, created_at DESC);
CREATE INDEX idx_eda_user ON public.evidence_download_audit (user_id, created_at DESC);

ALTER TABLE public.evidence_download_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all evidence download audits"
ON public.evidence_download_audit FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dispute parties can view their audits"
ON public.evidence_download_audit FOR SELECT
USING (public.is_dispute_party(auth.uid(), dispute_id));

CREATE POLICY "Dispute parties can insert audits"
ON public.evidence_download_audit FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_dispute_party(auth.uid(), dispute_id)
);


-- Add vendor_response column to disputes
ALTER TABLE public.disputes ADD COLUMN vendor_response text;

-- Create dispute_evidence table
CREATE TABLE public.dispute_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Dispute parties can view evidence
CREATE POLICY "Dispute parties can view evidence"
ON public.dispute_evidence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM disputes d
    WHERE d.id = dispute_evidence.dispute_id
    AND (
      d.opened_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = d.transaction_id
        AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
      )
    )
  )
);

-- Dispute parties can insert evidence
CREATE POLICY "Users can upload evidence to their disputes"
ON public.dispute_evidence
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM disputes d
    WHERE d.id = dispute_evidence.dispute_id
    AND (
      d.opened_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = d.transaction_id
        AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
      )
    )
  )
);

-- Admins can manage all evidence
CREATE POLICY "Admins can manage all evidence"
ON public.dispute_evidence
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow vendors to update disputes on their transactions (for vendor_response)
CREATE POLICY "Vendors can update disputes on their transactions"
ON public.disputes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = disputes.transaction_id
    AND t.vendor_id = auth.uid()
  )
);

-- Allow dispute parties to insert dispute events
CREATE POLICY "Dispute parties can insert events"
ON public.dispute_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM disputes d
    WHERE d.id = dispute_events.dispute_id
    AND (
      d.opened_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.id = d.transaction_id
        AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
      )
    )
  )
);

-- Create storage bucket for dispute evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-evidence', 'dispute-evidence', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload dispute evidence"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'dispute-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view dispute evidence"
ON storage.objects
FOR SELECT
USING (bucket_id = 'dispute-evidence' AND auth.role() = 'authenticated');

-- Enable RLS on the public_profiles view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Create RLS policies for the view through a workaround:
-- Since views inherit RLS from base tables when using security_invoker,
-- we need to add a policy on profiles that allows users to see basic info 
-- of transaction counterparties

-- Create policy for transaction counterparties to see limited profile info
-- This policy allows access only to the user_id, full_name, avatar_url fields
-- through the view, but the view already filters to only those columns
CREATE POLICY "Transaction parties can view counterparty basic info"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE (
      (t.client_id = auth.uid() AND t.vendor_id = profiles.user_id)
      OR
      (t.vendor_id = auth.uid() AND t.client_id = profiles.user_id)
    )
  )
);
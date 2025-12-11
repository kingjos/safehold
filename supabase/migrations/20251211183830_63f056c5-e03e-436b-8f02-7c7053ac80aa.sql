-- Drop the policy that exposes full profile data to counterparties
DROP POLICY IF EXISTS "Transaction parties can view counterparty profiles" ON public.profiles;

-- Create a secure view for public profile data (non-sensitive fields only)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create a security definer function to safely get counterparty public info
CREATE OR REPLACE FUNCTION public.get_transaction_counterparty_profile(transaction_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  is_client boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    t.client_id = p.user_id as is_client
  FROM transactions t
  JOIN profiles p ON (
    (t.client_id = auth.uid() AND t.vendor_id = p.user_id)
    OR
    (t.vendor_id = auth.uid() AND t.client_id = p.user_id)
  )
  WHERE t.id = transaction_id
$$;
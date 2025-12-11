-- Remove the counterparty policy that exposes all columns
DROP POLICY IF EXISTS "Transaction parties can view counterparty basic info" ON public.profiles;

-- The public_profiles view with security_invoker will now only work with:
-- 1. Users viewing their own profile (via "Users can view their own profile")
-- 2. Admins viewing any profile (via "Admins can view all profiles")

-- For transaction counterparty info, the app should use the 
-- get_transaction_counterparty_profile function which only returns safe fields
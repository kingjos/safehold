-- Drop the public_profiles view since it's not needed
-- Counterparty profile lookups should use the secure get_transaction_counterparty_profile function
DROP VIEW IF EXISTS public.public_profiles;
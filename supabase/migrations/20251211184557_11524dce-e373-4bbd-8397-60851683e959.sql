-- Drop existing SELECT policies and recreate them as RESTRICTIVE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a single RESTRICTIVE SELECT policy that combines both conditions
-- Users can ONLY view their own profile OR if they are an admin
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);
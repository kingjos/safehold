CREATE OR REPLACE FUNCTION public.search_vendor_by_phone(p_phone text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, phone text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.phone, p.email
  FROM public.profiles p
  WHERE p.phone IS NOT NULL
    AND length(p_phone) >= 5
    AND p.phone LIKE '%' || p_phone || '%'
  ORDER BY 
    CASE WHEN p.phone = p_phone THEN 0
         WHEN p.phone LIKE p_phone || '%' THEN 1
         ELSE 2 END
  LIMIT 1;
$$;
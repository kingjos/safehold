REVOKE EXECUTE ON FUNCTION public.search_vendor_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_vendor_by_phone(text) TO authenticated;
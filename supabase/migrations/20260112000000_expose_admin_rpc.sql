
-- Ensure is_global_admin is accessible via RPC
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;

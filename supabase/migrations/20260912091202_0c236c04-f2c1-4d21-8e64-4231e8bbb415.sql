REVOKE ALL ON FUNCTION public.apply_account_defaults_to_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_account_defaults_to_profile() TO service_role;
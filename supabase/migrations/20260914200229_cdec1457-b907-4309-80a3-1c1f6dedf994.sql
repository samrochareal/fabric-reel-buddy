revoke execute on function public.claim_credit_refill(uuid) from anon, authenticated, public;
grant execute on function public.claim_credit_refill(uuid) to service_role;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.grant_master_role() from public, anon, authenticated;
revoke all on function public.admin_platform_stats() from public, anon;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_platform_stats() to authenticated;
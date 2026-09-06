REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.grant_master_role() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "No client updates of video jobs" ON public.video_jobs FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes of video jobs" ON public.video_jobs FOR DELETE TO anon, authenticated USING (false);
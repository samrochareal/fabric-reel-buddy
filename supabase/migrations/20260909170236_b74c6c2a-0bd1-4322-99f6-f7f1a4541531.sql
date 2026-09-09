CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link_url text,
  link_label text,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT TO authenticated
USING (target_user_id IS NULL OR target_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No client inserts of notifications"
ON public.notifications FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client updates of notifications"
ON public.notifications FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes of notifications"
ON public.notifications FOR DELETE TO anon, authenticated USING (false);

CREATE INDEX notifications_target_idx ON public.notifications (target_user_id, created_at DESC);

CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

GRANT SELECT, INSERT ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
ON public.notification_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can mark their own reads"
ON public.notification_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "No client updates of reads"
ON public.notification_reads FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes of reads"
ON public.notification_reads FOR DELETE TO anon, authenticated USING (false);

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  _title text,
  _body text,
  _link_url text,
  _link_label text,
  _target_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.notifications (title, body, link_url, link_label, target_user_id)
  VALUES (_title, COALESCE(_body, ''), NULLIF(_link_url, ''), NULLIF(_link_label, ''), _target_user_id)
  RETURNING id INTO _id;
  RETURN jsonb_build_object('id', _id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_notification(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, text, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_list_notifications()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT n.id, n.title, n.body, n.link_url, n.link_label, n.target_user_id, n.created_at,
           p.email AS target_email
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.target_user_id
    ORDER BY n.created_at DESC
    LIMIT 100
  ) x;
$$;

REVOKE ALL ON FUNCTION public.admin_list_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_notifications() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_notification(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_notification(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_notification(uuid) TO service_role;
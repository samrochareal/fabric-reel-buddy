ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_refill_amount integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS credit_refill_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS last_refill_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_tools jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 5;
UPDATE public.profiles SET credits = 5 WHERE credits = 0 AND credits_used = 0;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
declare result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select coalesce(jsonb_agg(row_to_json(u)::jsonb order by u.created_at desc), '[]'::jsonb)
  into result
  from (
    select
      p.id,
      p.email,
      p.full_name,
      p.created_at,
      p.credits,
      p.credits_used,
      p.credit_refill_amount,
      p.credit_refill_hours,
      p.last_refill_at,
      p.premium,
      p.access_expires_at,
      p.blocked,
      p.allowed_tools,
      exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin') as is_admin,
      (select coalesce(sum(v.clips), 0) from public.video_jobs v where v.user_id = p.id) as videos_processed,
      (select round(coalesce(sum(v.duration_seconds), 0) / 60.0, 1) from public.video_jobs v where v.user_id = p.id) as minutes_processed,
      (select max(v.created_at) from public.video_jobs v where v.user_id = p.id) as last_activity_at,
      (select count(*) from public.overlay_presets o where o.user_id = p.id) as overlay_count
    from public.profiles p
  ) u;

  return result;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user(
  _user_id uuid,
  _credits integer default null,
  _credit_refill_amount integer default null,
  _credit_refill_hours integer default null,
  _premium boolean default null,
  _access_expires_at timestamptz default null,
  _clear_expiry boolean default false,
  _blocked boolean default null,
  _allowed_tools jsonb default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare updated jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  update public.profiles p set
    credits = coalesce(_credits, p.credits),
    credit_refill_amount = coalesce(_credit_refill_amount, p.credit_refill_amount),
    credit_refill_hours = coalesce(_credit_refill_hours, p.credit_refill_hours),
    premium = coalesce(_premium, p.premium),
    access_expires_at = case when _clear_expiry then null else coalesce(_access_expires_at, p.access_expires_at) end,
    blocked = coalesce(_blocked, p.blocked),
    allowed_tools = coalesce(_allowed_tools, p.allowed_tools)
  where p.id = _user_id
  returning to_jsonb(p) into updated;

  return coalesce(updated, '{}'::jsonb);
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_consume_credits(_user_id uuid, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare p public.profiles; begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select * into p from public.profiles where id = _user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  -- automatic refill once the waiting window has passed
  if p.credits <= 0 and p.credit_refill_amount > 0
     and now() - p.last_refill_at >= make_interval(hours => p.credit_refill_hours) then
    update public.profiles set credits = p.credit_refill_amount, last_refill_at = now()
    where id = _user_id returning * into p;
  end if;

  if p.premium then
    update public.profiles set credits_used = p.credits_used + _amount
    where id = _user_id returning * into p;
    return jsonb_build_object('ok', true, 'credits', p.credits, 'premium', true);
  end if;

  if p.credits < _amount then
    return jsonb_build_object('ok', false, 'reason', 'no_credits', 'credits', p.credits,
      'next_refill_at', p.last_refill_at + make_interval(hours => p.credit_refill_hours));
  end if;

  update public.profiles set credits = p.credits - _amount, credits_used = p.credits_used + _amount
  where id = _user_id returning * into p;

  insert into public.credit_transactions (user_id, amount, reason)
  values (_user_id, -_amount, 'video_processed');

  return jsonb_build_object('ok', true, 'credits', p.credits, 'premium', false);
end;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, integer, integer, integer, boolean, timestamptz, boolean, boolean, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.admin_consume_credits(uuid, integer) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, integer, integer, integer, boolean, timestamptz, boolean, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_consume_credits(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_master_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if lower(coalesce(new.email, '')) = 'samrochareal@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
    update public.profiles set premium = true where id = new.id;
  end if;
  return new;
end;
$$;

UPDATE public.profiles SET premium = true
WHERE lower(coalesce(email, '')) = 'samrochareal@gmail.com';
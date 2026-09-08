alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id);

update public.profiles
set referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where referral_code is null;

alter table public.profiles
  alter column referral_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

create unique index if not exists profiles_referral_code_key on public.profiles(referral_code);

alter table public.platform_settings
  add column if not exists referral_enabled boolean not null default false,
  add column if not exists referral_reward_credits integer not null default 5;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade unique,
  reward_credits integer not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;

alter table public.referrals enable row level security;

create policy "Users can view referrals they made" on public.referrals
  for select to authenticated using (auth.uid() = referrer_id);
create policy "No client inserts of referrals" on public.referrals
  for insert to anon, authenticated with check (false);
create policy "No client updates of referrals" on public.referrals
  for update to anon, authenticated using (false) with check (false);
create policy "No client deletes of referrals" on public.referrals
  for delete to anon, authenticated using (false);

create or replace function public.admin_claim_referral(_user_id uuid, _code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare s public.platform_settings; ref public.profiles; me public.profiles;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select * into s from public.platform_settings limit 1;
  if s is null or not s.referral_enabled then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into me from public.profiles where id = _user_id;
  if me is null or me.referred_by is not null then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  select * into ref from public.profiles where referral_code = _code;
  if ref is null or ref.id = _user_id then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.profiles set referred_by = ref.id where id = _user_id;

  insert into public.referrals (referrer_id, referred_user_id, reward_credits)
  values (ref.id, _user_id, s.referral_reward_credits)
  on conflict (referred_user_id) do nothing;

  update public.profiles set credits = credits + s.referral_reward_credits where id = ref.id;

  insert into public.credit_transactions (user_id, amount, reason)
  values (ref.id, s.referral_reward_credits, 'referral_bonus');

  return jsonb_build_object('ok', true, 'credits', s.referral_reward_credits);
end;
$$;

revoke all on function public.admin_claim_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_claim_referral(uuid, text) to service_role;

create or replace function public.admin_platform_stats()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'new_users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'total_videos', (select coalesce(sum(clips), 0) from public.video_jobs),
    'videos_7d', (select coalesce(sum(clips), 0) from public.video_jobs where created_at > now() - interval '7 days'),
    'videos_30d', (select coalesce(sum(clips), 0) from public.video_jobs where created_at > now() - interval '30 days'),
    'total_minutes', (select round(coalesce(sum(duration_seconds), 0) / 60.0, 1) from public.video_jobs),
    'active_users_30d', (select count(distinct user_id) from public.video_jobs where created_at > now() - interval '30 days'),
    'overlay_presets', (select count(*) from public.overlay_presets),
    'premium_users', (select count(*) from public.profiles where premium),
    'blocked_users', (select count(*) from public.profiles where blocked),
    'credits_available', (select coalesce(sum(credits), 0) from public.profiles),
    'credits_used', (select coalesce(sum(credits_used), 0) from public.profiles),
    'referral_enabled', (select coalesce(referral_enabled, false) from public.platform_settings limit 1),
    'referral_reward_credits', (select coalesce(referral_reward_credits, 0) from public.platform_settings limit 1),
    'total_referrals', (select count(*) from public.referrals),
    'referrals_7d', (select count(*) from public.referrals where created_at > now() - interval '7 days'),
    'referral_credits_awarded', (select coalesce(sum(reward_credits), 0) from public.referrals),
    'referring_users', (select count(distinct referrer_id) from public.referrals),
    'top_referrers', (
      select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.invites desc), '[]'::jsonb)
      from (
        select p.email, p.full_name, count(r.id) as invites,
               coalesce(sum(r.reward_credits), 0) as credits
        from public.referrals r
        join public.profiles p on p.id = r.referrer_id
        group by p.email, p.full_name
        order by count(r.id) desc
        limit 5
      ) x
    ),
    'daily', (
      select coalesce(jsonb_agg(row order by row->>'day'), '[]'::jsonb) from (
        select jsonb_build_object('day', d::date, 'videos', (
          select coalesce(sum(clips), 0) from public.video_jobs
          where created_at >= d and created_at < d + interval '1 day'
        )) as row
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      ) s2
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_platform_stats() from public, anon, authenticated;
grant execute on function public.admin_platform_stats() to service_role;
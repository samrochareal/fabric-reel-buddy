-- roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- master bootstrap: grant admin when the master email creates a profile
create or replace function public.grant_master_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'samrochareal@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

create trigger grant_master_role_on_profile
after insert on public.profiles
for each row execute function public.grant_master_role();

-- platform identity
create table public.platform_settings (
  id boolean primary key default true,
  system_name text not null default 'Fábrica de Reels',
  tagline text,
  palette jsonb not null default '{"primary":"#f97316","background":"#0b0b0d","accent":"#fb923c"}'::jsonb,
  logo_url text,
  icon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);
grant select on public.platform_settings to anon, authenticated;
grant insert, update on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "Anyone can view platform settings" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "Admins can insert platform settings" on public.platform_settings
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update platform settings" on public.platform_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create trigger update_platform_settings_updated_at
before update on public.platform_settings
for each row execute function public.update_updated_at_column();

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- usage log
create table public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  clips integer not null default 1,
  duration_seconds numeric,
  output_bytes bigint,
  created_at timestamptz not null default now()
);
grant select, insert on public.video_jobs to authenticated;
grant all on public.video_jobs to service_role;
alter table public.video_jobs enable row level security;
create policy "Users can insert their own video jobs" on public.video_jobs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view their own video jobs" on public.video_jobs
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins can view all video jobs" on public.video_jobs
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create index video_jobs_created_at_idx on public.video_jobs (created_at desc);

-- admin stats
create or replace function public.admin_platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
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
    'daily', (
      select coalesce(jsonb_agg(row order by row->>'day'), '[]'::jsonb) from (
        select jsonb_build_object('day', d::date, 'videos', (
          select coalesce(sum(clips), 0) from public.video_jobs
          where created_at >= d and created_at < d + interval '1 day'
        )) as row
        from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
      ) s
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_platform_stats() from public;
grant execute on function public.admin_platform_stats() to authenticated;
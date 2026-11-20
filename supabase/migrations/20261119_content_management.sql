-- Inventario editorial independiente de las publicaciones sincronizadas de Instagram.
create table public.content_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  event_date date, location text not null default '',
  created_at timestamptz not null default now(),
  unique (id, account_id)
);

create table public.editorial_content (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  event_id uuid, title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '', topics text[] not null default '{}',
  recording_date date, drive_url text not null default '', drive_file_id text,
  thumbnail_url text not null default '', status text not null default 'pending' check (status in ('pending','scheduled','published')),
  scheduled_date date, scheduled_time time, published_at timestamptz, instagram_url text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint content_event_account_fk foreign key (event_id, account_id) references public.content_events(id, account_id),
  constraint scheduled_needs_datetime check (status <> 'scheduled' or (scheduled_date is not null and scheduled_time is not null))
);
create unique index editorial_content_drive_unique on public.editorial_content(account_id, drive_file_id) where drive_file_id is not null;
create index editorial_content_calendar_idx on public.editorial_content(account_id, scheduled_date, scheduled_time);

create table public.content_editorial_settings (
  account_id uuid primary key references public.instagram_accounts(id) on delete cascade,
  timezone text not null default 'Europe/Madrid', avoid_consecutive_event boolean not null default true,
  min_event_days integer not null default 0 check (min_event_days between 0 and 365),
  warn_topic boolean not null default true, max_per_day integer not null default 1 check (max_per_day between 1 and 100)
);

alter table public.content_events enable row level security;
alter table public.editorial_content enable row level security;
alter table public.content_editorial_settings enable row level security;
create policy "Owner manages content events" on public.content_events for all to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "Owner manages editorial content" on public.editorial_content for all to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy "Owner manages editorial settings" on public.content_editorial_settings for all to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
revoke all on public.content_events, public.editorial_content, public.content_editorial_settings from anon, authenticated;
grant select, insert, update, delete on public.content_events, public.editorial_content to authenticated;
grant select, insert, update on public.content_editorial_settings to authenticated;

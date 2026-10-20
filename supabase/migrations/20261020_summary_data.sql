create table public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_user_id text unique,
  username text not null,
  account_type text check (account_type in ('business', 'creator')),
  connection_status text not null default 'pending' check (connection_status in ('pending', 'connected', 'expired', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  metric_date date not null,
  followers integer not null default 0 check (followers >= 0),
  reach integer not null default 0 check (reach >= 0),
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  saves integer not null default 0 check (saves >= 0),
  shares integer not null default 0 check (shares >= 0),
  publications integer not null default 0 check (publications >= 0),
  reels integer not null default 0 check (reels >= 0),
  carousels integer not null default 0 check (carousels >= 0),
  stories integer not null default 0 check (stories >= 0),
  source text not null check (source in ('instagram', 'manual')),
  created_at timestamptz not null default now(),
  unique (account_id, metric_date)
);

create table public.media_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  instagram_media_id text unique,
  media_type text not null check (media_type in ('reel', 'carousel', 'image', 'story')),
  published_at timestamptz,
  caption text,
  reach integer not null default 0,
  views integer not null default 0,
  likes integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  source text not null check (source in ('instagram', 'manual')),
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  metric_key text not null,
  period text not null check (period in ('weekly', 'monthly')),
  start_date date not null,
  end_date date not null,
  target numeric not null check (target >= 0),
  baseline numeric not null default 0,
  source text not null check (source in ('ai', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_diagnoses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'error')),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, week_start)
);

alter table public.instagram_accounts enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.media_metrics enable row level security;
alter table public.goals enable row level security;
alter table public.weekly_diagnoses enable row level security;

create policy "Users manage their Instagram accounts" on public.instagram_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their daily metrics" on public.daily_metrics for all using (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid())) with check (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid()));
create policy "Users manage their media metrics" on public.media_metrics for all using (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid())) with check (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid()));
create policy "Users manage their goals" on public.goals for all using (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid())) with check (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid()));
create policy "Users read their diagnoses" on public.weekly_diagnoses for select using (exists (select 1 from public.instagram_accounts accounts where accounts.id = account_id and accounts.user_id = auth.uid()));

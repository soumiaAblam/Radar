-- Extiende la biblioteca sin cambiar los estados ni los metadatos ya guardados.
alter table public.editorial_content drop constraint if exists editorial_content_status_check;
alter table public.editorial_content add constraint editorial_content_status_check check (status in ('pending','selected','editing','scheduled','published'));
alter table public.editorial_content add column if not exists drive_folder_id text;
alter table public.editorial_content add column if not exists drive_folder_path text not null default '';
alter table public.editorial_content add column if not exists drive_source_name text;
alter table public.editorial_content add column if not exists drive_file_created_at timestamptz;
alter table public.editorial_content add column if not exists drive_sort_order integer;

create table public.drive_oauth_states (
  state_hash text primary key,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.drive_connections (
  account_id uuid primary key references public.instagram_accounts(id) on delete cascade,
  refresh_token_ciphertext text not null,
  updated_at timestamptz not null default now()
);
create table public.drive_sources (
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  folder_id text not null,
  folder_name text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (account_id, folder_id)
);
alter table public.drive_oauth_states enable row level security;
alter table public.drive_connections enable row level security;
alter table public.drive_sources enable row level security;
revoke all on public.drive_oauth_states, public.drive_connections, public.drive_sources from anon, authenticated;
create policy "Owner can see drive sources" on public.drive_sources for select to authenticated
  using (exists (select 1 from public.instagram_accounts a where a.id = account_id and a.user_id = auth.uid()));
grant select on public.drive_sources to authenticated;

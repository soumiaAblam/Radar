-- Las claves que acompañan a ciertos enlaces compartidos solo las usa el servidor.
create table public.drive_source_access (
  account_id uuid not null,
  folder_id text not null,
  resource_key_ciphertext text not null,
  primary key (account_id, folder_id),
  foreign key (account_id, folder_id) references public.drive_sources(account_id, folder_id) on delete cascade
);
alter table public.drive_source_access enable row level security;
revoke all on public.drive_source_access from anon, authenticated;

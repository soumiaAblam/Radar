-- Estados de un solo uso para proteger el retorno de Meta OAuth.
create table public.instagram_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index instagram_oauth_states_expires_at_idx
  on public.instagram_oauth_states (expires_at);

alter table public.instagram_oauth_states enable row level security;

-- Los tokens nunca se exponen al navegador: RLS no tiene políticas y los
-- roles anon/authenticated no tienen permisos sobre esta tabla.
create table public.instagram_connection_tokens (
  account_id uuid primary key references public.instagram_accounts(id) on delete cascade,
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.instagram_connection_tokens enable row level security;
revoke all on table public.instagram_connection_tokens from anon, authenticated;

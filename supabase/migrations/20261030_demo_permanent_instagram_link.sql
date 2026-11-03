-- Vinculación protegida y permanente para la cuenta de demostración.
-- La fila "pending" reserva el destino esperado; no contiene credenciales ni
-- datos simulados de Instagram. El identificador real se escribe únicamente
-- desde el callback OAuth con service_role.

create table if not exists public.demo_instagram_bindings (
  internal_user_id uuid primary key references auth.users(id) on delete cascade,
  expected_username text not null default 'Retorika_Academy',
  instagram_account_id text unique,
  instagram_username text,
  connection_status text not null default 'pending'
    check (connection_status in ('pending', 'connected', 'expired', 'error')),
  linked_at timestamptz,
  reauthorization_required_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_instagram_expected_username_check
    check (lower(expected_username) = 'retorika_academy'),
  constraint demo_instagram_actual_username_check
    check (instagram_username is null or lower(instagram_username) = 'retorika_academy')
);

create table if not exists public.demo_instagram_link_invites (
  id uuid primary key default gen_random_uuid(),
  internal_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.demo_instagram_bindings enable row level security;
alter table public.demo_instagram_link_invites enable row level security;

drop policy if exists "Demo user can read their protected binding" on public.demo_instagram_bindings;
create policy "Demo user can read their protected binding"
  on public.demo_instagram_bindings for select
  using (auth.uid() = internal_user_id);

-- No se concede acceso cliente a las invitaciones: contienen el hash de un
-- enlace de autorización de un solo uso y se gestionan solo por Edge Functions.
revoke all on table public.demo_instagram_link_invites from anon, authenticated;

create or replace function public.provision_demo_instagram_binding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'demo@demo.com' then
    insert into public.demo_instagram_bindings (internal_user_id)
    values (new.id)
    on conflict (internal_user_id) do nothing;

    insert into public.instagram_accounts (user_id, username, connection_status, auth_provider)
    select new.id, 'Retorika_Academy', 'pending', 'facebook'
    where not exists (
      select 1 from public.instagram_accounts where user_id = new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists provision_demo_instagram_binding_after_user on auth.users;
create trigger provision_demo_instagram_binding_after_user
after insert on auth.users
for each row execute function public.provision_demo_instagram_binding();

-- También reserva la vinculación si el usuario demo se creó antes de aplicar
-- esta migración.
do $$
declare
  demo_user record;
begin
  for demo_user in select id from auth.users where lower(email) = 'demo@demo.com'
  loop
    insert into public.demo_instagram_bindings (internal_user_id)
    values (demo_user.id)
    on conflict (internal_user_id) do nothing;

    insert into public.instagram_accounts (user_id, username, connection_status, auth_provider)
    select demo_user.id, 'Retorika_Academy', 'pending', 'facebook'
    where not exists (
      select 1 from public.instagram_accounts where user_id = demo_user.id
    );
  end loop;
end;
$$;

create or replace function public.protect_demo_instagram_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_email text;
  reserved_account_count integer;
begin
  if tg_op = 'DELETE' then
    select email into owner_email from auth.users where id = old.user_id;
  else
    select email into owner_email from auth.users where id = new.user_id;
  end if;

  if lower(coalesce(owner_email, '')) <> 'demo@demo.com' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if auth.uid() = old.user_id then
      raise exception 'La cuenta demo de Instagram no se puede eliminar desde el cliente.';
    end if;
    return old;
  end if;

  if lower(new.username) <> 'retorika_academy' then
    raise exception 'La cuenta demo solo puede vincular Retorika_Academy.';
  end if;

  select count(*) into reserved_account_count
  from public.instagram_accounts
  where user_id = new.user_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if reserved_account_count > 0 then
    raise exception 'La cuenta demo solo admite una vinculación de Instagram.';
  end if;

  if tg_op = 'UPDATE' and auth.uid() = old.user_id then
    raise exception 'La vinculación demo solo se actualiza tras OAuth en el servidor.';
  end if;

  if tg_op = 'UPDATE'
    and old.instagram_user_id is not null
    and new.instagram_user_id is distinct from old.instagram_user_id then
    raise exception 'El identificador de Instagram vinculado es inmutable.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_demo_instagram_account_before_change on public.instagram_accounts;
create trigger protect_demo_instagram_account_before_change
before insert or update or delete on public.instagram_accounts
for each row execute function public.protect_demo_instagram_account();

create or replace function public.protect_demo_binding_immutable_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.instagram_account_id is not null
    and new.instagram_account_id is distinct from old.instagram_account_id then
    raise exception 'El identificador de Instagram vinculado es inmutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_demo_binding_immutable_id_before_update on public.demo_instagram_bindings;
create trigger protect_demo_binding_immutable_id_before_update
before update on public.demo_instagram_bindings
for each row execute function public.protect_demo_binding_immutable_id();


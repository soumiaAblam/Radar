-- Retorika_Academy sigue siendo la cuenta principal e inmutable del usuario
-- demo. A partir de ahora el mismo usuario puede añadir otras cuentas, pero
-- exclusivamente por la vía avanzada de Meta (nunca Instagram Login básico).

alter table public.instagram_oauth_states
  add column if not exists connection_intent text not null default 'standard'
  check (connection_intent in ('standard', 'additional_advanced'));

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
      select 1
      from public.instagram_accounts
      where user_id = new.id and lower(username) = 'retorika_academy'
    );
  end if;
  return new;
end;
$$;

-- Asegura la reserva principal también para instalaciones donde el usuario
-- demo ya existía antes de esta migración.
insert into public.instagram_accounts (user_id, username, connection_status, auth_provider)
select id, 'Retorika_Academy', 'pending', 'facebook'
from auth.users
where lower(email) = 'demo@demo.com'
  and not exists (
    select 1
    from public.instagram_accounts
    where instagram_accounts.user_id = auth.users.id
      and lower(instagram_accounts.username) = 'retorika_academy'
  );

create or replace function public.protect_demo_instagram_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_email text;
  old_is_primary boolean := false;
  new_is_primary boolean := false;
begin
  if tg_op = 'DELETE' then
    select email into owner_email from auth.users where id = old.user_id;
    old_is_primary := lower(old.username) = 'retorika_academy';
  else
    select email into owner_email from auth.users where id = new.user_id;
    new_is_primary := lower(new.username) = 'retorika_academy';
    if tg_op = 'UPDATE' then old_is_primary := lower(old.username) = 'retorika_academy'; end if;
  end if;

  if lower(coalesce(owner_email, '')) <> 'demo@demo.com' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old_is_primary then
      raise exception 'La cuenta principal Retorika_Academy no se puede eliminar.';
    end if;
    if auth.uid() = old.user_id then
      raise exception 'Las cuentas de Instagram se gestionan mediante OAuth.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old_is_primary and not new_is_primary then
    raise exception 'La cuenta principal Retorika_Academy no se puede sustituir.';
  end if;
  if tg_op = 'UPDATE' and not old_is_primary and new_is_primary then
    raise exception 'No se puede convertir una cuenta adicional en la principal.';
  end if;

  if new_is_primary then
    if tg_op = 'INSERT' and exists (
      select 1 from public.instagram_accounts
      where user_id = new.user_id and lower(username) = 'retorika_academy'
    ) then
      raise exception 'La cuenta principal Retorika_Academy ya existe.';
    end if;
    if tg_op = 'UPDATE' and auth.uid() = old.user_id then
      raise exception 'La cuenta principal solo se actualiza tras OAuth en el servidor.';
    end if;
    if tg_op = 'UPDATE' and old.instagram_user_id is not null
      and new.instagram_user_id is distinct from old.instagram_user_id then
      raise exception 'El identificador de la cuenta principal es inmutable.';
    end if;
  elsif new.auth_provider <> 'facebook' then
    raise exception 'Las cuentas adicionales del demo deben usar la conexión avanzada de Meta.';
  end if;

  return new;
end;
$$;

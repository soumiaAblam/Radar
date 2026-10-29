-- Distingue la ruta de autorización de cada cuenta conectada.
-- Las cuentas existentes conservan Facebook Login; las nuevas podrán usar
-- Instagram Login sin necesidad de una Página de Facebook.
alter table public.instagram_accounts
  add column if not exists auth_provider text not null default 'facebook'
  check (auth_provider in ('facebook', 'instagram'));

comment on column public.instagram_accounts.auth_provider is
  'Ruta OAuth usada para conectar la cuenta: facebook o instagram.';

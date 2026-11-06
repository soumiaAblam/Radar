-- URLs de miniaturas proporcionadas por Meta; pueden caducar y se actualizan
-- al volver a sincronizar. No se almacenan archivos ni credenciales.
alter table public.media_metrics
  add column if not exists media_url text,
  add column if not exists thumbnail_url text;

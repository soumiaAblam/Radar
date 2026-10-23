alter table public.media_metrics
  add column title text,
  add column topic text,
  add column comments integer not null default 0 check (comments >= 0);

comment on table public.media_metrics is 'Publicaciones importadas de Instagram o registradas manualmente para el análisis de contenido.';
comment on column public.media_metrics.source is 'Origen de la publicación: instagram para importaciones futuras o manual para registros introducidos por el equipo.';

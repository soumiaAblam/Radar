alter table public.media_metrics
  add column published_time time;

comment on column public.media_metrics.published_time is 'Hora de publicación, usada para analizar los horarios con mejor rendimiento.';

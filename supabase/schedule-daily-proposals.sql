-- Ejecutar manualmente SOLO después de desplegar instagram-daily-proposals,
-- configurar DAILY_PROPOSALS_SECRET en Edge Functions y guardar en Vault:
--   radar_project_url: la URL del proyecto Supabase
--   radar_daily_proposals_secret: el mismo secreto largo y aleatorio
-- No incluir los valores secretos en este archivo ni en el repositorio.
-- Comprueba la configuración en un entorno de prueba antes de activar el job.

select cron.schedule(
  'radar-daily-proposals',
  '15 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'radar_project_url' limit 1) || '/functions/v1/instagram-daily-proposals',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-daily-proposals-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'radar_daily_proposals_secret' limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000
    )
    where extract(hour from now() at time zone 'Europe/Madrid') = 9
      and exists (select 1 from vault.decrypted_secrets where name = 'radar_project_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'radar_daily_proposals_secret');
  $job$
);

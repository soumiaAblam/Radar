# Propuestas diarias de RADAR

Esta función prepara tres borradores al día para la cuenta conectada `retorika_academy`. Nunca publica ni programa publicaciones en Instagram. La autorización solo queda registrada en RADAR. No existe una fuente de tendencias en tiempo real: las ideas se inspiran en el histórico sincronizado, sin afirmar que sean tendencias verificadas.

## Antes de activar

- Aplicar la migración `20261109_ai_content_proposals.sql` en el proyecto correcto y desplegar `instagram-daily-proposals` y la web. Verificar primero las políticas RLS y el bucket privado en un proyecto de prueba.
- Comprobar `GEMINI_API_KEY` y los permisos y cuotas de los modelos de texto e imagen. Tres imágenes diarias pueden consumir cuota y generar cargos si la cuenta tiene facturación; no activar facturación sin aprobación.
- Preparar un secreto largo, aleatorio y exclusivo para este proceso; configurarlo en los secretos de Edge Functions con el nombre `DAILY_PROPOSALS_SECRET`. No usar la clave de Gemini ni publicar el valor en el código o en el chat.
- En Supabase Vault crear `radar_project_url` con la URL del proyecto y `radar_daily_proposals_secret` con el mismo secreto exclusivo. Gestionar los valores de forma privada. El secreto enviado por pg_net puede ser visible temporalmente para roles con acceso a la cola interna de la base de datos.
- Habilitar `pg_cron`, `pg_net` y Vault si es necesario. Ejecutar `schedule-daily-proposals.sql` para crear el trabajo, previa revisión del destino. El trabajo se evalúa cada hora y solo llama a la función a las 09:15 de Europe/Madrid, ajustando el horario de verano.

## Comprobación y límites

- Comprobar una primera ejecución en los registros de Cron y de la función, y verificar que aparecen tres propuestas pendientes. Si no hay publicaciones sincronizadas o falla el texto, se registra un error para ese día.
- Cada cuenta tiene como máximo un lote diario. Si falla, el lote conserva el error y el siguiente intento automático será al día siguiente; no hay reintento manual implementado. Si falla la imagen por cuota, el texto se conserva y se indica que el visual no está disponible.
- Se generan imágenes, no vídeos. Los archivos se guardan en un bucket privado; no se requiere ni se crea un bucket público.
- Para detener la generación, desactivar el trabajo `radar-daily-proposals` desde Supabase Cron. Descartar una propuesta no elimina las imágenes almacenadas; estas siguen sujetas a la política de retención del proyecto.
- Las URLs firmadas de previsualización duran una hora; recargar la página para renovarlas. La edición de propuestas modifica título, descripción y hashtags, no la imagen.

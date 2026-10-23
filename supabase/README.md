# Conexión segura de Instagram

Estas funciones conectan RADAR con Meta sin exponer el secreto de la aplicación ni los tokens en el navegador.

## Antes de desplegar

1. En Supabase abre **Authentication > Providers** y activa **Anonymous sign-ins**. El acceso visible de RADAR continúa siendo `demo@demo.com`; esta sesión interna permite que RLS asigne las cuentas conectadas a un usuario.
2. En **SQL Editor**, ejecuta `migrations/20261023_instagram_oauth.sql`.
3. En **Edge Functions > Secrets**, añade estos valores:

   - `META_APP_ID`: identificador de la app Retorika RADAR Demo.
   - `META_APP_SECRET`: clave secreta de la app de Meta. No la copies en este repositorio.
   - `META_REDIRECT_URL`: `https://vrbjpvebmtjbdpzpatdk.supabase.co/functions/v1/instagram-oauth-callback`
   - `APP_ORIGIN`: URL pública de RADAR, por ejemplo `https://radar-five-vert.vercel.app`.
   - `META_GRAPH_VERSION`: la versión activa que muestre Meta, por ejemplo `v24.0`.
   - `META_LOGIN_CONFIGURATION_ID`: solo si Meta genera un identificador de configuración para Facebook Login for Business.

## Despliegue

Con la CLI de Supabase instalada y vinculada al proyecto:

```bash
supabase functions deploy instagram-oauth-start
supabase functions deploy instagram-oauth-callback
supabase functions deploy instagram-sync
```

En Meta, añade la misma `META_REDIRECT_URL` en la configuración de Facebook Login for Business como URL de redirección OAuth válida. No actives webhooks todavía.

## Prueba

1. Entra a RADAR con la cuenta demo.
2. Pulsa **Añadir nueva cuenta > Conectar con Instagram**.
3. Autoriza la cuenta profesional de prueba en Meta.
4. Al volver a RADAR, selecciónala en el header y pulsa **Sincronizar publicaciones**.

Si el token caduca, vuelve a conectar la cuenta. Los tokens se guardan en una tabla protegida por RLS, sin permisos para el navegador.

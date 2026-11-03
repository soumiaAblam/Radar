# Vinculación permanente de `Retorika_Academy`

Este flujo está reservado a la sesión interna `demo@demo.com` y a la única
cuenta objetivo `@Retorika_Academy`.

No hay un formulario de usuario o contraseña de Instagram en RADAR. La
propietaria recibe un enlace de un solo uso, inicia sesión directamente en
Meta/Facebook y aprueba los permisos en la pantalla oficial de Meta.

## Qué protege

- Una reserva persistente de una única cuenta de Instagram para el usuario
  interno de `demo@demo.com`.
- El `instagram_account_id` queda inmutable después de la primera aprobación.
- La aplicación bloquea las rutas OAuth normales para la cuenta demo.
- No hay acciones de cliente para borrar, sustituir o añadir una segunda cuenta.
- Los enlaces para la propietaria se guardan solo como SHA-256, caducan en 24
  horas y se consumen una sola vez.
- El token de Meta se conserva únicamente en `instagram_connection_tokens`,
  tabla sin permisos para `anon` ni `authenticated`; las Edge Functions la
  acceden usando `SUPABASE_SERVICE_ROLE_KEY`. Supabase cifra el almacenamiento
  del proyecto en reposo. No expongas nunca el token en el navegador, Git o
  variables `VITE_*`.

Si el token vence, la sincronización marca la vinculación como `expired` y
mantiene la cuenta reservada. Desde la cuenta demo se puede generar otro enlace
para renovar la autorización de la misma propietaria y de la misma cuenta.

## Activación

1. Crea en Supabase Auth un usuario de correo confirmado `demo@demo.com`.
   Define una contraseña propia y segura. El formulario usa la contraseña que
   escriba la persona autorizada y no contiene ninguna clave fija en el código.
2. Aplica `supabase/migrations/20261030_demo_permanent_instagram_link.sql` en
   el SQL Editor de Supabase. Si las migraciones antiguas ya se aplicaron
   manualmente, no ejecutes `supabase db push` contra todo el historial: pega
   únicamente esta migración nueva en el SQL Editor.
3. Configura los secretos de Edge Functions y despliega las tres funciones
   listadas más abajo.
4. Inicia sesión como `demo@demo.com`, pulsa **Vincular Retorika_Academy** y
   genera el enlace. Envíalo por un canal privado a la propietaria de la cuenta.
5. La propietaria abre ese enlace y completa OAuth. Al regresar a RADAR la
   conexión queda persistida y aparece automáticamente como conectada.

## Secretos de Supabase

Configura estos valores en **Supabase → Edge Functions → Secrets**. Nunca en
variables de frontend ni con prefijo `VITE_`.

| Variable | Valor |
| --- | --- |
| `APP_ORIGIN` | URL pública de RADAR, por ejemplo `https://radar-five-vert.vercel.app` |
| `DEMO_ACCOUNT_EMAIL` | `demo@demo.com` (opcional; es el valor predeterminado) |
| `META_APP_ID` | App ID de la aplicación de Meta |
| `META_APP_SECRET` | App secret de Meta |
| `META_GRAPH_VERSION` | Versión de Graph API habilitada para la app, por ejemplo `v24.0` |
| `META_LOGIN_CONFIGURATION_ID` | ID de configuración de Facebook Login for Business, solo si Meta te lo proporciona |
| `DEMO_META_REDIRECT_URL` | `https://<project-ref>.supabase.co/functions/v1/demo-instagram-link-callback` |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están disponibles para las Edge
Functions en el entorno de Supabase. No los copies al cliente.

Despliega:

```powershell
npm exec supabase functions deploy demo-instagram-link-create
npm exec supabase functions deploy demo-instagram-link-start
npm exec supabase functions deploy demo-instagram-link-callback
npm exec supabase functions deploy instagram-sync
```

## Configuración de Meta

El flujo es **avanzado**, porque sincroniza publicaciones y métricas. La cuenta
`@Retorika_Academy` debe ser profesional (Business o Creator), estar vinculada
a una Página de Facebook y la propietaria debe tener el nivel de acceso que
Meta exige a esa Página.

1. En **Meta for Developers → Retorika RADAR Demo → Facebook Login for
   Business / Instagram API setup**, añade como URI de redirección OAuth válida
   exactamente el valor de `DEMO_META_REDIRECT_URL`.
2. Habilita los permisos solicitados por el flujo:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement` y `business_management`.
3. Mientras la aplicación esté en desarrollo, añade a la propietaria de
   `@Retorika_Academy` como rol/tester de la aplicación y pide que acepte la
   invitación. En producción, solicita la revisión/acceso avanzado de Meta para
   los permisos que correspondan antes de conectar cuentas de terceros.
4. Confirma que la URL coincida carácter por carácter: protocolo `https`,
   subdominio, ruta `demo-instagram-link-callback` y sin una barra final extra.

Si la propietaria cancela, Meta devuelve al panel con un aviso y la reserva se
conserva. Si autoriza una cuenta distinta de `@Retorika_Academy`, el servidor
la rechaza sin almacenar su token ni sustituir la cuenta esperada.

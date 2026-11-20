# Conexión de Google Drive para Gestión de contenidos

La integración requiere una cuenta autenticada de RADAR que sea propietaria de la cuenta de Instagram seleccionada. La aplicación usa la API de Google Drive únicamente para leer; nunca mueve ni elimina archivos en Drive.

## 1. Base de datos

Aplica la migración `20261119_content_management.sql` solo si todavía no se ha instalado y, después, `20261120_drive_library.sql` y `20261120_drive_library_resource_keys.sql`, en ese orden. Revisa primero qué migraciones están aplicadas: no ejecutes de nuevo las que ya se hayan instalado. Las migraciones posteriores conservan los registros existentes y añaden estados, metadatos y acceso seguro para enlaces compartidos.

## 2. Google Cloud

1. Activa la API de Google Drive en un proyecto de Google Cloud.
2. Configura la pantalla de consentimiento OAuth y crea un cliente OAuth de tipo aplicación web.
3. Añade como URI de redirección autorizada la URL exacta de la función, por ejemplo `https://<project-ref>.supabase.co/functions/v1/drive-oauth-callback`.
4. La función solicita `https://www.googleapis.com/auth/drive.readonly`. Es un permiso **restringido** que permite leer los archivos accesibles por la cuenta autorizada, no solo la carpeta que se seleccione después. La publicación de la aplicación puede requerir verificación y evaluación de seguridad de Google; mientras tanto, sigue las restricciones de usuarios de prueba que correspondan en Google Cloud.

## 3. Secretos de Supabase Edge Functions

En los secretos de las funciones del proyecto, configura:

- `GOOGLE_DRIVE_CLIENT_ID` y `GOOGLE_DRIVE_CLIENT_SECRET`: datos del cliente OAuth de Google.
- `GOOGLE_DRIVE_REDIRECT_URI`: exactamente la URI registrada en Google Cloud.
- `DRIVE_TOKEN_ENCRYPTION_KEY`: 32 bytes aleatorios codificados en base64. En PowerShell se puede generar con `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`. Guarda el valor en un gestor seguro y no lo compartas en conversaciones ni lo incorpores al código.
- `APP_ORIGIN`: dirección exacta de la aplicación autorizada, sin barra final.

**No cambies ni pierdas la clave de cifrado después de conectar una cuenta**: los tokens ya guardados no se podrán descifrar y habrá que volver a autorizar. La clave del cliente y los tokens nunca deben colocarse en variables `VITE_` ni enviarse al navegador.

## 4. Despliegue

Despliega `drive-oauth-start`, `drive-oauth-callback` y `drive-library` en el proyecto Supabase. La configuración de `supabase/config.toml` deja la función de retorno OAuth sin verificación JWT porque Google redirige al navegador sin sesión de Supabase; la función comprueba y consume un estado temporal de un solo uso. Las otras dos funciones requieren JWT y comprueban el propietario de la cuenta.

El despliegue del frontend y la aplicación de migraciones son pasos independientes. No se ejecutan automáticamente al guardar estos archivos.

## 5. Uso y límites actuales

En Gestión de contenidos, pulsa **Vincular cuenta de Drive**, autoriza en Google y pulsa **Vincular carpeta de Drive** para pegar el enlace completo de la carpeta compartida. Después pulsa **Sincronizar contenido**. También se puede vincular la raíz de Mi unidad. Si el enlace contiene una clave de recurso, se conserva cifrada en una tabla accesible solo al servidor. El servidor recorre subcarpetas y páginas de resultados; no sigue accesos directos de Drive. Las carpetas compartidas deben ser accesibles por la cuenta autorizada; la aplicación no altera los permisos de Google.

Los vídeos se identifican por el ID original de Drive. Una nueva sincronización añade vídeos nuevos y no sobrescribe título, descripción, evento, programación ni estado de los existentes. Si se registró manualmente un vídeo antes de sincronizarlo, se completan solo sus metadatos de carpeta ausentes. No se eliminan registros si un archivo desaparece de Drive.

La jerarquía se muestra como ruta de carpeta. Los vídeos se ordenan por nombre natural de Drive dentro de cada carpeta; Google no proporciona un orden manual universal de carpeta. Una carpeta no se convierte automáticamente en un evento: los eventos se asignan explícitamente. La fecha de creación del archivo no se presenta como fecha de grabación.

Las miniaturas privadas de Drive todavía no se importan: se usa la miniatura manual existente o la imagen de reserva. La importación de bibliotecas muy grandes está limitada a 1.000 carpetas y 3.000 vídeos por ejecución; si se supera el límite, los registros ya importados se conservan y hay que vincular una carpeta más concreta. La demo permanece separada y no se sincroniza.

Antes de usarlo con contenido real, prueba OAuth, permisos, carpetas compartidas, sincronización repetida, caducidad de autorización y aislamiento entre dos usuarios en un entorno de prueba. Las pruebas locales con datos simulados no sustituyen esa verificación.

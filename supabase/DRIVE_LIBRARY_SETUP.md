# Importación desde carpetas compartidas de Google Drive

La persona que usa RADAR pega el enlace de una carpeta de Google Drive compartida con «Cualquier persona con el enlace». Al vincularla, RADAR importa los vídeos y las imágenes de la carpeta y sus subcarpetas sin pedir acceso a una cuenta de Google. Las carpetas privadas o compartidas solo con personas concretas no se pueden importar con este método. Los accesos directos de Drive no se siguen.

## Configuración

1. Comprueba que estén aplicadas, en orden, las migraciones `20261119_content_management.sql`, `20261120_drive_library.sql`, `20261120_drive_library_resource_keys.sql` y `20261125_proposal_editor.sql`. No vuelvas a ejecutar migraciones ya aplicadas.
2. Activa la API de Google Drive en Google Cloud y crea una clave de API restringida a esa API y al servidor que la utilice.
3. Configura `GOOGLE_DRIVE_API_KEY` como secreto de las Edge Functions de Supabase. Configura también `APP_ORIGIN` y `DRIVE_TOKEN_ENCRYPTION_KEY`, una clave de 32 bytes codificada en base64, necesaria para cifrar las claves de acceso incluidas en algunos enlaces compartidos. Si ya existe una clave de cifrado, consérvala para poder leer los enlaces previamente guardados. No pongas secretos en variables `VITE_`, en el código ni en conversaciones.
4. Despliega la función `drive-library` y el frontend actualizado. La configuración de secretos y el despliegue no se realizan automáticamente al editar el proyecto.

La sesión de RADAR sigue siendo necesaria y el servidor comprueba que la cuenta seleccionada pertenezca al usuario. Las credenciales OAuth de Google anteriores ya no son necesarias para importar enlaces compartidos. Las carpetas que antes solo eran accesibles mediante una cuenta de Google deberán compartirse con enlace para poder sincronizarse con este método; «Mi unidad» completa no es compatible.

## Funcionamiento y límites

La sincronización recorre las páginas de resultados y las subcarpetas, e importa vídeos e imágenes. Identifica cada archivo por su ID de Drive: las sincronizaciones posteriores añaden archivos nuevos sin sobrescribir títulos, descripciones, eventos, programación ni estados editoriales. Si un archivo deja de estar en Drive, no se elimina su registro de RADAR. El servicio nunca modifica los archivos o permisos de Drive.

La importación está limitada a 1.000 carpetas y 3.000 vídeos por ejecución; si se supera el límite, los vídeos ya importados se conservan. La demo permanece separada y no se sincroniza. Antes de usar la función con contenido real, comprueba una carpeta compartida, una carpeta privada, una sincronización repetida, un enlace con clave de recurso y el aislamiento entre cuentas.

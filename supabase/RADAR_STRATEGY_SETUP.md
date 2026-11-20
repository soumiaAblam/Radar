# Activación del espacio estratégico de Radar

La interfaz y las funciones del diario están implementadas en el proyecto, pero necesitan la migración `migrations/20261116_radar_strategy.sql` en la base de datos del proyecto correcto. No aplicar a ciegas todas las migraciones históricas: algunas instalaciones existentes se configuraron manualmente.

## Antes de aplicar

1. Revisar la migración y hacer la copia de seguridad habitual de la base de datos. Probar primero en un entorno de pruebas si existe.
2. Confirmar que existen `public.instagram_accounts`, `public.media_metrics`, `public.weekly_diagnoses` y las columnas `weekly_diagnoses.status` y `weekly_diagnoses.generated_at`. La migración añade un trigger a esta última tabla para registrar futuros análisis sin cambiar los análisis guardados.
3. Ejecutar **solo una vez** el contenido de la migración en SQL Editor o utilizar el proceso de migraciones que corresponda al historial real del proyecto. La migración crea las tablas `radar_actions`, `radar_experiments`, `radar_activity`, políticas RLS, índices y triggers.
4. Desplegar la web actualizada. No es necesario volver a desplegar la función existente `instagram-ai-diagnosis` ni cambiar secretos de Gemini.

## Verificación

- Iniciar sesión con una cuenta propietaria de una cuenta de Instagram y comprobar crear, editar, completar, reabrir y descartar una acción. Al completar una acción recurrente, verificar que se crea una sola siguiente tarea.
- Convertir una oportunidad en acción dos veces y comprobar que la segunda no cree un duplicado. Crear, iniciar y evaluar un experimento, comprobando el historial.
- Verificar con otra cuenta de usuario que no pueda leer ni modificar acciones, experimentos ni actividad de la primera cuenta, y que una publicación vinculada pertenezca a la misma cuenta de Instagram.
- Probar la generación IA ya existente sin alterar sus restricciones y confirmar que los diagnósticos guardados previamente se conservan. El historial de eventos de Radar empieza tras aplicar la migración y no reconstruye los eventos antiguos.
- Revisar escritorio y móvil, teclado y movimiento reducido. Si falla la carga de las tablas, la interfaz indica que falta instalar o configurar el espacio estratégico; no inventa datos de actividad.

La recurrencia crea una nueva tarea al completar la actual. Reabrir la tarea anterior no borra la siguiente tarea que ya se haya creado. Las acciones y experimentos descartados se conservan para evitar regenerar automáticamente recomendaciones ya rechazadas.

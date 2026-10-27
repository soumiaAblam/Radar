-- Permite identificar el proveedor y el momento de generación del diagnóstico.
-- El contenido completo sigue guardándose en `analysis` y solo la Edge Function
-- con clave de servicio puede escribir en esta tabla.
alter table public.weekly_diagnoses
  add column if not exists provider text,
  add column if not exists generated_at timestamptz;

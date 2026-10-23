import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Faltan las variables de entorno de Supabase.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

/**
 * El acceso visual de RADAR sigue siendo la cuenta demo. Esta sesión anónima
 * solo aporta un identificador de Supabase para que las cuentas y métricas
 * conectadas respeten las políticas de seguridad de la base de datos.
 */
export async function ensureDemoSession() {
  const { data: currentSession, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (currentSession.session) {
    return currentSession.session
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error || !data.session) {
    throw error ?? new Error('No se ha podido crear la sesión segura de demostración.')
  }

  return data.session
}

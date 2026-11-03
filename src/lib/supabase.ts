import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Faltan las variables de entorno de Supabase.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

/** Devuelve una sesión autenticada; las vinculaciones nunca se asignan a anónimos. */
export async function ensureDemoSession() {
  const { data: currentSession, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (currentSession.session && !currentSession.session.user.is_anonymous) {
    return currentSession.session
  }
  if (currentSession.session?.user.is_anonymous) await supabase.auth.signOut()
  throw new Error('Inicia sesión para acceder a las cuentas vinculadas.')
}

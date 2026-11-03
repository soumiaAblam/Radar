import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, ...corsHeaders },
  })
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? ''
  const requestOrigin = request.headers.get('Origin') ?? ''
  const allowedOrigin = requestOrigin === appOrigin || requestOrigin === 'http://localhost:5173' || requestOrigin === 'http://127.0.0.1:5173'
    ? requestOrigin
    : appOrigin

  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigin, ...corsHeaders } })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, allowedOrigin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const demoEmail = (Deno.env.get('DEMO_ACCOUNT_EMAIL') ?? 'demo@demo.com').toLowerCase()
  if (!supabaseUrl || !serviceRoleKey || !appOrigin) return json({ error: 'Falta configurar la función de vinculación demo.' }, 500, allowedOrigin)

  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!accessToken) return json({ error: 'Inicia sesión para generar el enlace de autorización.' }, 401, allowedOrigin)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
  const user = authData.user
  if (authError || !user || user.is_anonymous) return json({ error: 'La sesión de RADAR ya no es válida.' }, 401, allowedOrigin)
  if (user.email?.toLowerCase() !== demoEmail) return json({ error: 'Este enlace protegido solo puede generarse desde la cuenta demo.' }, 403, allowedOrigin)

  const { data: binding, error: bindingError } = await admin
    .from('demo_instagram_bindings')
    .select('instagram_account_id, connection_status, expected_username')
    .eq('internal_user_id', user.id)
    .maybeSingle()

  if (bindingError || !binding) return json({ error: 'No existe la reserva segura de Retorika_Academy. Aplica la migración de vinculación demo.' }, 409, allowedOrigin)
  if (binding.instagram_account_id && binding.connection_status === 'connected') {
    return json({ error: 'Retorika_Academy ya está vinculada. No se puede sustituir desde la aplicación.' }, 409, allowedOrigin)
  }

  const invite = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
  const { error: insertError } = await admin.from('demo_instagram_link_invites').insert({
    internal_user_id: user.id,
    token_hash: await sha256(invite),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
  if (insertError) return json({ error: 'No se ha podido generar el enlace seguro.' }, 500, allowedOrigin)

  const authorizationUrl = new URL('/functions/v1/demo-instagram-link-start', supabaseUrl)
  authorizationUrl.searchParams.set('invite', invite)
  return json({ authorizationUrl: authorizationUrl.toString(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), username: binding.expected_username }, 200, allowedOrigin)
})

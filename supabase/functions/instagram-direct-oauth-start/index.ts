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
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
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
  const instagramAppId = Deno.env.get('INSTAGRAM_LOGIN_APP_ID')
  const redirectUri = Deno.env.get('INSTAGRAM_LOGIN_REDIRECT_URL')
  const authorization = request.headers.get('Authorization')
  const accessToken = authorization?.replace(/^Bearer\s+/i, '')

  if (!supabaseUrl || !serviceRoleKey || !instagramAppId || !redirectUri || !appOrigin) {
    return json({ error: 'La conexión directa con Instagram aún no está configurada. Configura Instagram Login en Meta y sus secretos en Supabase.' }, 503, allowedOrigin)
  }
  if (!accessToken) return json({ error: 'Necesitas una sesión de RADAR para conectar una cuenta.' }, 401, allowedOrigin)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken)
  if (userError || !userData.user) return json({ error: 'La sesión de RADAR ya no es válida.' }, 401, allowedOrigin)

  const state = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
  const { error: stateError } = await admin.from('instagram_oauth_states').insert({
    user_id: userData.user.id,
    state_hash: await sha256(state),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  if (stateError) return json({ error: 'No se ha podido preparar la autorización de Instagram.' }, 500, allowedOrigin)

  const parameters = new URLSearchParams({
    client_id: instagramAppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    // Instagram Login directo no concede Insights. La vía avanzada usa
    // Facebook Login y conserva sus permisos de métricas por separado.
    scope: 'instagram_business_basic',
    enable_fb_login: '0',
    force_authentication: '1',
  })
  return json({ authorizationUrl: `https://www.instagram.com/oauth/authorize?${parameters.toString()}` }, 200, allowedOrigin)
})

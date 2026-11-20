import { admin, base64url, configured, digest, headers, json, ownsAccount, userFor } from '../_shared/drive.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers:headers(request) })
  if (request.method !== 'POST') return json(request, { error:'Método no permitido.' }, 405)
  if (!configured()) return json(request, { error:'Falta configurar Google Drive en Supabase.' }, 503)
  const user = await userFor(request)
  if (!user) return json(request, { error:'Inicia sesión para conectar Drive.' }, 401)
  let accountId = ''
  try { accountId = String((await request.json()).accountId || '') } catch { return json(request, { error:'Solicitud incorrecta.' }, 400) }
  if (!await ownsAccount(user.id, accountId)) return json(request, { error:'Cuenta no disponible.' }, 403)
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const { error } = await admin().from('drive_oauth_states').insert({ state_hash:await digest(state), user_id:user.id, account_id:accountId, code_verifier:verifier, expires_at:new Date(Date.now() + 10 * 60000).toISOString() })
  if (error) return json(request, { error:'No se pudo iniciar la conexión.' }, 500)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id:Deno.env.get('GOOGLE_DRIVE_CLIENT_ID')!, redirect_uri:Deno.env.get('GOOGLE_DRIVE_REDIRECT_URI')!, response_type:'code', scope:'https://www.googleapis.com/auth/drive.readonly', access_type:'offline', prompt:'consent', state, code_challenge:await digest(verifier), code_challenge_method:'S256' }).toString()
  return json(request, { authorizationUrl:url.toString() })
})

import { admin, configured, digest, encrypt, ownsAccount } from '../_shared/drive.ts'

function redirect(status: string) { const url = new URL('/gestion-contenido', Deno.env.get('APP_ORIGIN')!); url.searchParams.set('drive', status); return new Response(null, { status:302, headers:{ Location:url.toString(), 'Referrer-Policy':'no-referrer', 'Cache-Control':'no-store' } }) }
Deno.serve(async (request) => {
  if (!configured()) return new Response('Configuración de Drive incompleta.', { status:503 })
  const url = new URL(request.url), state = url.searchParams.get('state'), code = url.searchParams.get('code')
  if (!state || !code || url.searchParams.has('error')) return redirect('error')
  try {
    // DELETE ... RETURNING consume el estado en una sola operación y evita reutilizarlo.
    const { data, error } = await admin().from('drive_oauth_states').delete().eq('state_hash', await digest(state)).gt('expires_at', new Date().toISOString()).select('account_id,user_id,code_verifier').maybeSingle()
    if (error || !data || !await ownsAccount(data.user_id, data.account_id)) return redirect('error')
    const response = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body:new URLSearchParams({ code, client_id:Deno.env.get('GOOGLE_DRIVE_CLIENT_ID')!, client_secret:Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET')!, redirect_uri:Deno.env.get('GOOGLE_DRIVE_REDIRECT_URI')!, grant_type:'authorization_code', code_verifier:data.code_verifier }) })
    const tokens = await response.json()
    if (!response.ok || typeof tokens.refresh_token !== 'string' || typeof tokens.scope !== 'string' || !tokens.scope.split(' ').includes('https://www.googleapis.com/auth/drive.readonly')) return redirect('error')
    const { error: saveError } = await admin().from('drive_connections').upsert({ account_id:data.account_id, refresh_token_ciphertext:await encrypt(tokens.refresh_token, data.account_id), updated_at:new Date().toISOString() })
    return redirect(saveError ? 'error' : 'connected')
  } catch { return redirect('error') }
})

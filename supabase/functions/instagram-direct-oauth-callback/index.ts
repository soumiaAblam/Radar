import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InstagramProfile = { user_id?: string, id?: string, username?: string }
type TokenResponse = { access_token?: string, user_id?: string, expires_in?: number }

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function redirect(appOrigin: string, status: 'connected' | 'error', reason?: string) {
  const target = new URL('/Dashboard', appOrigin)
  target.searchParams.set('instagram', status)
  if (reason) target.searchParams.set('reason', reason)
  return Response.redirect(target, 302)
}

async function readJson(url: URL, init?: RequestInit) {
  const result = await fetch(url, init)
  const payload = await result.json()
  if (!result.ok) throw new Error(payload?.error_message ?? payload?.error?.message ?? 'Instagram no ha devuelto datos válidos.')
  return payload
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const instagramAppId = Deno.env.get('INSTAGRAM_LOGIN_APP_ID')
  const instagramAppSecret = Deno.env.get('INSTAGRAM_LOGIN_APP_SECRET')
  const redirectUri = Deno.env.get('INSTAGRAM_LOGIN_REDIRECT_URL')
  if (!appOrigin || !supabaseUrl || !serviceRoleKey || !instagramAppId || !instagramAppSecret || !redirectUri) {
    return new Response('Configuración de Instagram Login incompleta.', { status: 500 })
  }

  const callbackUrl = new URL(request.url)
  const state = callbackUrl.searchParams.get('state')
  const code = callbackUrl.searchParams.get('code')
  if (callbackUrl.searchParams.get('error') || !state || !code) return redirect(appOrigin, 'error', 'instagram_denied')

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: oauthState, error: stateError } = await admin
    .from('instagram_oauth_states')
    .select('id, user_id')
    .eq('state_hash', await sha256(state))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (stateError || !oauthState) return redirect(appOrigin, 'error', 'invalid_state')

  const { error: consumeError } = await admin
    .from('instagram_oauth_states')
    .update({ used_at: new Date().toISOString() })
    .eq('id', oauthState.id)
    .is('used_at', null)
  if (consumeError) return redirect(appOrigin, 'error', 'state_unavailable')

  try {
    const tokenResponse = await readJson(new URL('https://api.instagram.com/oauth/access_token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: instagramAppId,
        client_secret: instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    }) as TokenResponse
    if (!tokenResponse.access_token) throw new Error('Instagram no ha devuelto un token de acceso.')

    let accessToken = tokenResponse.access_token
    let expiresIn = Number(tokenResponse.expires_in ?? 0)
    try {
      const exchangeUrl = new URL('https://graph.instagram.com/access_token')
      exchangeUrl.search = new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: instagramAppSecret,
        access_token: accessToken,
      }).toString()
      const longLived = await readJson(exchangeUrl) as TokenResponse
      if (longLived.access_token) accessToken = longLived.access_token
      expiresIn = Number(longLived.expires_in ?? expiresIn)
    } catch {
      // Se conserva el token inicial si Instagram no permite aún el intercambio largo.
    }

    const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
    const profileUrl = new URL(`https://graph.instagram.com/${version}/me`)
    profileUrl.search = new URLSearchParams({ fields: 'user_id,username', access_token: accessToken }).toString()
    const profile = await readJson(profileUrl) as InstagramProfile
    const instagramUserId = profile.user_id ?? profile.id ?? tokenResponse.user_id
    if (!instagramUserId || !profile.username) throw new Error('Instagram no ha devuelto una cuenta profesional válida.')

    const { data: existingAccount, error: existingError } = await admin
      .from('instagram_accounts')
      .select('id, user_id')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle()
    if (existingError || (existingAccount && existingAccount.user_id !== oauthState.user_id)) {
      throw new Error('La cuenta ya pertenece a otro usuario de RADAR.')
    }

    let accountId = existingAccount?.id
    if (accountId) {
      const { error } = await admin.from('instagram_accounts').update({
        username: profile.username,
        connection_status: 'connected',
        auth_provider: 'instagram',
        updated_at: new Date().toISOString(),
      }).eq('id', accountId)
      if (error) throw error
    } else {
      const { data, error } = await admin.from('instagram_accounts').insert({
        user_id: oauthState.user_id,
        instagram_user_id: instagramUserId,
        username: profile.username,
        connection_status: 'connected',
        auth_provider: 'instagram',
      }).select('id').single()
      if (error) throw error
      accountId = data.id
    }

    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
    const { error: tokenError } = await admin.from('instagram_connection_tokens').upsert({
      account_id: accountId,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    if (tokenError) throw tokenError
    return redirect(appOrigin, 'connected')
  } catch (error) {
    console.error('Instagram Login callback error:', error instanceof Error ? error.message : 'Error desconocido.')
    return redirect(appOrigin, 'error', 'instagram_callback_failed')
  }
})

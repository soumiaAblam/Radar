import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type MetaPage = {
  instagram_business_account?: {
    id: string
    username?: string
    account_type?: string
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function redirect(appOrigin: string, status: 'connected' | 'error') {
  const target = new URL('/Dashboard', appOrigin)
  target.searchParams.set('instagram', status)
  return Response.redirect(target, 302)
}

async function metaJson(url: URL) {
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Meta no ha devuelto una respuesta válida.')
  }

  return payload
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const metaAppId = Deno.env.get('META_APP_ID')
  const metaAppSecret = Deno.env.get('META_APP_SECRET')
  const redirectUri = Deno.env.get('META_REDIRECT_URL')

  if (!appOrigin || !supabaseUrl || !serviceRoleKey || !metaAppId || !metaAppSecret || !redirectUri) {
    return new Response('Configuración incompleta.', { status: 500 })
  }

  const callbackUrl = new URL(request.url)
  const state = callbackUrl.searchParams.get('state')
  const code = callbackUrl.searchParams.get('code')

  if (callbackUrl.searchParams.get('error') || !state || !code) {
    return redirect(appOrigin, 'error')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: oauthState, error: stateError } = await admin
    .from('instagram_oauth_states')
    .select('id, user_id')
    .eq('state_hash', await sha256(state))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (stateError || !oauthState) {
    return redirect(appOrigin, 'error')
  }

  const { error: consumeError } = await admin
    .from('instagram_oauth_states')
    .update({ used_at: new Date().toISOString() })
    .eq('id', oauthState.id)
    .is('used_at', null)

  if (consumeError) {
    return redirect(appOrigin, 'error')
  }

  try {
    const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
    const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`)
    tokenUrl.search = new URLSearchParams({
      client_id: metaAppId,
      client_secret: metaAppSecret,
      redirect_uri: redirectUri,
      code,
    }).toString()
    const shortLivedToken = await metaJson(tokenUrl)

    const longLivedUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`)
    longLivedUrl.search = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: metaAppId,
      client_secret: metaAppSecret,
      fb_exchange_token: shortLivedToken.access_token,
    }).toString()

    let token = shortLivedToken.access_token as string
    let expiresIn = Number(shortLivedToken.expires_in ?? 0)

    try {
      const longLivedToken = await metaJson(longLivedUrl)
      token = longLivedToken.access_token as string
      expiresIn = Number(longLivedToken.expires_in ?? expiresIn)
    } catch {
      // Si Meta no permite el canje largo todavía, se conserva el token de prueba.
    }

    const pagesUrl = new URL(`https://graph.facebook.com/${version}/me/accounts`)
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username,account_type}')
    pagesUrl.searchParams.set('access_token', token)
    const pages = await metaJson(pagesUrl) as { data?: MetaPage[] }
    const instagramAccount = pages.data
      ?.map((page) => page.instagram_business_account)
      .find((account): account is NonNullable<MetaPage['instagram_business_account']> => Boolean(account?.id))

    if (!instagramAccount?.username) {
      return redirect(appOrigin, 'error')
    }

    const { data: existingAccount, error: existingError } = await admin
      .from('instagram_accounts')
      .select('id, user_id')
      .eq('instagram_user_id', instagramAccount.id)
      .maybeSingle()

    if (existingError || (existingAccount && existingAccount.user_id !== oauthState.user_id)) {
      return redirect(appOrigin, 'error')
    }

    const accountType = instagramAccount.account_type?.toLowerCase() === 'creator' ? 'creator' : 'business'
    let accountId = existingAccount?.id

    if (accountId) {
      const { error } = await admin.from('instagram_accounts').update({
        username: instagramAccount.username,
        account_type: accountType,
        connection_status: 'connected',
        updated_at: new Date().toISOString(),
      }).eq('id', accountId)
      if (error) throw error
    } else {
      const { data, error } = await admin.from('instagram_accounts').insert({
        user_id: oauthState.user_id,
        instagram_user_id: instagramAccount.id,
        username: instagramAccount.username,
        account_type: accountType,
        connection_status: 'connected',
      }).select('id').single()
      if (error) throw error
      accountId = data.id
    }

    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
    const { error: tokenError } = await admin.from('instagram_connection_tokens').upsert({
      account_id: accountId,
      access_token: token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

    if (tokenError) throw tokenError
    return redirect(appOrigin, 'connected')
  } catch {
    return redirect(appOrigin, 'error')
  }
})

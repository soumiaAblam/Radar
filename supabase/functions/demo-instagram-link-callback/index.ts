import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type MetaPage = { instagram_business_account?: { id: string, username?: string } }

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function redirect(appOrigin: string, status: 'connected' | 'error', reason?: string) {
  const target = new URL('/Dashboard', appOrigin)
  target.searchParams.set('instagram', status)
  target.searchParams.set('flow', 'demo-owner-link')
  if (reason) target.searchParams.set('reason', reason)
  return Response.redirect(target, 302)
}

async function metaJson(url: URL) {
  const result = await fetch(url)
  const payload = await result.json()
  if (!result.ok) throw new Error(payload?.error?.message ?? 'Meta no ha devuelto una respuesta válida.')
  return payload
}

async function markBindingError(admin: ReturnType<typeof createClient>, internalUserId: string | undefined) {
  if (!internalUserId) return
  await admin.from('demo_instagram_bindings').update({
    connection_status: 'error',
    updated_at: new Date().toISOString(),
  }).eq('internal_user_id', internalUserId).neq('connection_status', 'connected')
  await admin.from('instagram_accounts')
    .update({ connection_status: 'error', updated_at: new Date().toISOString() })
    .eq('user_id', internalUserId)
    .ilike('username', 'retorika\\_academy')
    .neq('connection_status', 'connected')
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const metaAppId = Deno.env.get('META_APP_ID')
  const metaAppSecret = Deno.env.get('META_APP_SECRET')
  const redirectUri = Deno.env.get('DEMO_META_REDIRECT_URL')
  if (!appOrigin || !supabaseUrl || !serviceRoleKey || !metaAppId || !metaAppSecret || !redirectUri) return new Response('Configuración incompleta.', { status: 500 })

  const callbackUrl = new URL(request.url)
  const state = callbackUrl.searchParams.get('state')
  const code = callbackUrl.searchParams.get('code')
  const admin = createClient(supabaseUrl, serviceRoleKey)
  let ownerId: string | undefined

  if (!state) return redirect(appOrigin, 'error', 'missing_state')
  const { data: invitation, error: invitationError } = await admin
    .from('demo_instagram_link_invites')
    .select('id, internal_user_id')
    .eq('token_hash', await sha256(state))
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  ownerId = invitation?.internal_user_id
  if (invitationError || !invitation) return redirect(appOrigin, 'error', 'invalid_or_expired_invite')

  const { error: consumeError } = await admin.from('demo_instagram_link_invites')
    .update({ consumed_at: new Date().toISOString() }).eq('id', invitation.id).is('consumed_at', null)
  if (consumeError) return redirect(appOrigin, 'error', 'invite_unavailable')

  if (callbackUrl.searchParams.get('error') || !code) {
    await markBindingError(admin, ownerId)
    return redirect(appOrigin, 'error', 'meta_denied')
  }

  try {
    const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
    const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`)
    tokenUrl.search = new URLSearchParams({ client_id: metaAppId, client_secret: metaAppSecret, redirect_uri: redirectUri, code }).toString()
    const shortLived = await metaJson(tokenUrl) as { access_token: string, expires_in?: number }

    let token = shortLived.access_token
    let expiresIn = Number(shortLived.expires_in ?? 0)
    try {
      const longLivedUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`)
      longLivedUrl.search = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: metaAppId, client_secret: metaAppSecret, fb_exchange_token: token }).toString()
      const longLived = await metaJson(longLivedUrl) as { access_token: string, expires_in?: number }
      token = longLived.access_token
      expiresIn = Number(longLived.expires_in ?? expiresIn)
    } catch { /* Meta puede mantener un token de prueba corto. */ }

    const pagesUrl = new URL(`https://graph.facebook.com/${version}/me/accounts`)
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username}')
    pagesUrl.searchParams.set('access_token', token)
    const pages = await metaJson(pagesUrl) as { data?: MetaPage[] }
    const account = pages.data?.map((page) => page.instagram_business_account)
      .find((candidate): candidate is NonNullable<MetaPage['instagram_business_account']> => Boolean(candidate?.id && candidate.username && candidate.username.toLowerCase() === 'retorika_academy'))
    if (!account) {
      await markBindingError(admin, ownerId)
      return redirect(appOrigin, 'error', 'unexpected_instagram_account')
    }

    const { data: binding, error: bindingError } = await admin.from('demo_instagram_bindings')
      .select('instagram_account_id').eq('internal_user_id', ownerId).single()
    if (bindingError || !binding || (binding.instagram_account_id && binding.instagram_account_id !== account.id)) {
      await markBindingError(admin, ownerId)
      return redirect(appOrigin, 'error', 'account_replacement_blocked')
    }

    const now = new Date().toISOString()
    const { error: updateBindingError } = await admin.from('demo_instagram_bindings').update({
      instagram_account_id: account.id,
      instagram_username: account.username,
      connection_status: 'connected',
      linked_at: binding.instagram_account_id ? undefined : now,
      reauthorization_required_at: null,
      updated_at: now,
    }).eq('internal_user_id', ownerId)
    if (updateBindingError) throw updateBindingError

    const { data: reservedAccount, error: reservedError } = await admin.from('instagram_accounts')
      .select('id, instagram_user_id').eq('user_id', ownerId).ilike('username', 'retorika\\_academy').maybeSingle()
    if (reservedError || !reservedAccount || (reservedAccount.instagram_user_id && reservedAccount.instagram_user_id !== account.id)) throw new Error('La reserva de Retorika_Academy no es válida.')

    const { error: accountError } = await admin.from('instagram_accounts').update({
      instagram_user_id: account.id,
      username: account.username,
      connection_status: 'connected',
      auth_provider: 'facebook',
      updated_at: now,
    }).eq('id', reservedAccount.id)
    if (accountError) throw accountError

    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
    const { error: tokenError } = await admin.from('instagram_connection_tokens').upsert({
      account_id: reservedAccount.id,
      access_token: token,
      expires_at: expiresAt,
      updated_at: now,
    })
    if (tokenError) throw tokenError
    return redirect(appOrigin, 'connected')
  } catch (error) {
    console.error('Demo Instagram OAuth callback error:', error instanceof Error ? error.message : 'Error desconocido.')
    await markBindingError(admin, ownerId)
    return redirect(appOrigin, 'error', 'callback_failed')
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function dashboardRedirect(appOrigin: string, reason: string) {
  const target = new URL('/Dashboard', appOrigin)
  target.searchParams.set('instagram', 'error')
  target.searchParams.set('reason', reason)
  return Response.redirect(target, 302)
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const metaAppId = Deno.env.get('META_APP_ID')
  const redirectUri = Deno.env.get('DEMO_META_REDIRECT_URL')
  if (!appOrigin || !supabaseUrl || !serviceRoleKey || !metaAppId || !redirectUri) return new Response('Configuración incompleta.', { status: 500 })

  const invite = new URL(request.url).searchParams.get('invite')
  if (!invite) return dashboardRedirect(appOrigin, 'missing_invite')

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: invitation, error } = await admin
    .from('demo_instagram_link_invites')
    .select('id, internal_user_id')
    .eq('token_hash', await sha256(invite))
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error || !invitation) return dashboardRedirect(appOrigin, 'invalid_or_expired_invite')

  const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
  const parameters = new URLSearchParams({
    client_id: metaAppId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: invite,
    scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management',
    auth_type: 'rerequest',
    return_scopes: 'true',
  })
  const loginConfigurationId = Deno.env.get('META_LOGIN_CONFIGURATION_ID')
  if (loginConfigurationId) parameters.set('config_id', loginConfigurationId)
  return Response.redirect(`https://www.facebook.com/${version}/dialog/oauth?${parameters.toString()}`, 302)
})

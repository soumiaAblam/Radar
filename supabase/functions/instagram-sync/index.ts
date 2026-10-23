import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InstagramMedia = {
  id: string
  caption?: string
  media_type?: string
  media_product_type?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
}

type Insight = {
  name: string
  values?: Array<{ value?: number }>
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function response(body: Record<string, unknown>, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, ...corsHeaders },
  })
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0
}

function formatType(media: InstagramMedia) {
  if (media.media_product_type === 'REELS') return 'reel'
  if (media.media_type === 'CAROUSEL_ALBUM') return 'carousel'
  if (media.media_type === 'VIDEO') return 'reel'
  return 'image'
}

async function readJson(url: URL) {
  const result = await fetch(url)
  const payload = await result.json()
  if (!result.ok) throw new Error(payload?.error?.message ?? 'Meta no ha devuelto datos válidos.')
  return payload
}

async function getInsights(version: string, mediaId: string, accessToken: string) {
  try {
    const url = new URL(`https://graph.facebook.com/${version}/${mediaId}/insights`)
    url.searchParams.set('metric', 'reach,saved,shares,views')
    url.searchParams.set('access_token', accessToken)
    const result = await readJson(url) as { data?: Insight[] }
    return (result.data ?? []).reduce<Record<string, number>>((metrics, metric) => ({
      ...metrics,
      [metric.name]: asNumber(metric.values?.[0]?.value),
    }), {})
  } catch {
    // Algunos formatos no exponen todas las métricas. El resto de datos se importa igual.
    return {}
  }
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? ''
  const requestOrigin = request.headers.get('Origin') ?? ''
  const allowedOrigin = requestOrigin === appOrigin || requestOrigin === 'http://localhost:5173' || requestOrigin === 'http://127.0.0.1:5173'
    ? requestOrigin
    : appOrigin

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigin, ...corsHeaders } })
  }
  if (request.method !== 'POST') return response({ error: 'Método no permitido.' }, 405, allowedOrigin)

  const authorization = request.headers.get('Authorization')
  const userToken = authorization?.replace(/^Bearer\s+/i, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!userToken || !supabaseUrl || !serviceRoleKey) {
    return response({ error: 'No se ha podido validar la sesión.' }, 401, allowedOrigin)
  }

  const { accountId } = await request.json().catch(() => ({ accountId: '' })) as { accountId?: string }
  if (!accountId) return response({ error: 'Selecciona una cuenta de Instagram.' }, 400, allowedOrigin)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await admin.auth.getUser(userToken)
  if (userError || !userData.user) return response({ error: 'La sesión ha caducado.' }, 401, allowedOrigin)

  const { data: account, error: accountError } = await admin
    .from('instagram_accounts')
    .select('id, instagram_user_id')
    .eq('id', accountId)
    .eq('user_id', userData.user.id)
    .eq('connection_status', 'connected')
    .maybeSingle()

  if (accountError || !account?.instagram_user_id) {
    return response({ error: 'La cuenta no está disponible para sincronizar.' }, 404, allowedOrigin)
  }

  const { data: storedToken, error: tokenError } = await admin
    .from('instagram_connection_tokens')
    .select('access_token, expires_at')
    .eq('account_id', account.id)
    .maybeSingle()

  if (tokenError || !storedToken?.access_token || (storedToken.expires_at && new Date(storedToken.expires_at) <= new Date())) {
    return response({ error: 'La autorización de Meta ha caducado. Vuelve a conectar la cuenta.' }, 401, allowedOrigin)
  }

  try {
    const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
    const mediaUrl = new URL(`https://graph.facebook.com/${version}/${account.instagram_user_id}/media`)
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count')
    mediaUrl.searchParams.set('limit', '100')
    mediaUrl.searchParams.set('access_token', storedToken.access_token)
    const mediaResponse = await readJson(mediaUrl) as { data?: InstagramMedia[] }

    const records = await Promise.all((mediaResponse.data ?? []).map(async (media) => {
      const insights = await getInsights(version, media.id, storedToken.access_token)
      const publishedAt = media.timestamp ? new Date(media.timestamp) : null
      return {
        account_id: account.id,
        instagram_media_id: media.id,
        media_type: formatType(media),
        published_at: publishedAt?.toISOString() ?? null,
        published_time: publishedAt?.toISOString().slice(11, 19) ?? null,
        caption: media.caption ?? null,
        title: media.caption?.split('\n')[0]?.slice(0, 100) ?? 'Publicación de Instagram',
        reach: insights.reach ?? 0,
        views: insights.views ?? 0,
        likes: asNumber(media.like_count),
        comments: asNumber(media.comments_count),
        saves: insights.saved ?? 0,
        shares: insights.shares ?? 0,
        source: 'instagram',
      }
    }))

    if (records.length) {
      const { error: saveError } = await admin.from('media_metrics').upsert(records, { onConflict: 'instagram_media_id' })
      if (saveError) throw saveError
    }

    return response({ imported: records.length }, 200, allowedOrigin)
  } catch {
    return response({ error: 'No se han podido importar las publicaciones desde Meta.' }, 502, allowedOrigin)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { instagramTitle, sanitizeInstagramText } from '../_shared/instagram-text.ts'

type InstagramMedia = {
  id: string
  caption?: string
  media_type?: string
  media_product_type?: string
  timestamp?: string
  like_count?: number
  comments_count?: number
  media_url?: string
  thumbnail_url?: string
}

type Insight = {
  name: string
  values?: Array<{ value?: number }>
}

class MetaRequestError extends Error {
  constructor(message: string, readonly code?: number, readonly subcode?: number, readonly httpStatus?: number) {
    super(message)
    this.name = 'MetaRequestError'
  }
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
  if (!result.ok) throw new MetaRequestError(
    payload?.error?.message ?? 'Meta no ha devuelto datos válidos.',
    typeof payload?.error?.code === 'number' ? payload.error.code : undefined,
    typeof payload?.error?.error_subcode === 'number' ? payload.error.error_subcode : undefined,
    result.status,
  )
  return payload
}

async function getInsights(version: string, mediaId: string, accessToken: string, graphHost = 'graph.facebook.com') {
  try {
    const url = new URL(`https://${graphHost}/${version}/${mediaId}/insights`)
    url.searchParams.set('metric', 'reach,saved,shares,views')
    url.searchParams.set('access_token', accessToken)
    const result = await readJson(url) as { data?: Insight[] }
    return (result.data ?? []).reduce<Record<string, number>>((metrics, metric) => ({
      ...metrics,
      [metric.name]: asNumber(metric.values?.[0]?.value),
    }), {})
  } catch (error) {
    if (error instanceof MetaRequestError && error.code === 190) throw error
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
    .select('id, instagram_user_id, auth_provider, user_id')
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

  const markAuthorizationExpired = async () => {
    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('instagram_accounts')
      .update({ connection_status: 'expired', updated_at: now }).eq('id', account.id)
    if (updateError) throw updateError
    const { error: bindingError } = await admin.from('demo_instagram_bindings').update({
      connection_status: 'expired',
      reauthorization_required_at: now,
      updated_at: now,
    }).eq('internal_user_id', account.user_id).eq('instagram_account_id', account.instagram_user_id)
    if (bindingError) throw bindingError
  }

  if (tokenError) return response({ error: 'No se ha podido consultar la autorización de Meta. Inténtalo de nuevo.' }, 500, allowedOrigin)
  const tokenExpired = Boolean(storedToken?.expires_at && new Date(storedToken.expires_at) <= new Date())
  if (!storedToken?.access_token || tokenExpired) {
    try {
      await markAuthorizationExpired()
    } catch (error) {
      console.error('No se ha podido actualizar el estado de autorización:', error instanceof Error ? error.message : 'Error desconocido')
      return response({ error: 'No se ha podido actualizar el estado de la autorización. Inténtalo de nuevo.' }, 500, allowedOrigin)
    }
    return response({ error: 'La autorización de Meta ha caducado. Vuelve a conectar la cuenta.' }, 401, allowedOrigin)
  }

  let stage = 'consulta_publicaciones'
  try {
    const version = Deno.env.get('META_GRAPH_VERSION') ?? 'v24.0'
    const graphHost = account.auth_provider === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com'
    const mediaUrl = new URL(`https://${graphHost}/${version}/${account.instagram_user_id}/media`)
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count,media_url,thumbnail_url')
    mediaUrl.searchParams.set('limit', '100')
    mediaUrl.searchParams.set('access_token', storedToken.access_token)
    let mediaResponse: { data?: InstagramMedia[] }
    try {
      mediaResponse = await readJson(mediaUrl) as { data?: InstagramMedia[] }
    } catch (error) {
      if (!(error instanceof MetaRequestError) || error.code !== 100 || !/(media_url|thumbnail_url)/i.test(error.message)) throw error
      // Si Meta no permite esas propiedades, conserva la sincronización previa.
      mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count')
      mediaResponse = await readJson(mediaUrl) as { data?: InstagramMedia[] }
    }

    stage = 'preparacion_metricas'
    const records = await Promise.all((mediaResponse.data ?? []).map(async (media) => {
      const insights = account.auth_provider === 'facebook'
        ? await getInsights(version, media.id, storedToken.access_token, graphHost)
        : {}
      const publishedAt = media.timestamp ? new Date(media.timestamp) : null
      return {
        account_id: account.id,
        instagram_media_id: media.id,
        media_type: formatType(media),
        published_at: publishedAt?.toISOString() ?? null,
        published_time: publishedAt?.toISOString().slice(11, 19) ?? null,
        caption: media.caption === undefined ? null : sanitizeInstagramText(media.caption),
        title: instagramTitle(media.caption),
        media_url: media.media_url ?? null,
        thumbnail_url: media.thumbnail_url ?? null,
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
      stage = 'guardar_publicaciones'
      const { error: saveError } = await admin.from('media_metrics').upsert(records, { onConflict: 'instagram_media_id' })
      if (saveError?.code === 'PGRST204' && /(?:media_url|thumbnail_url)/.test(saveError.message)) {
        // Compatibilidad temporal mientras se aplica la migración de miniaturas.
        const legacyRecords = records.map(({ media_url: _mediaUrl, thumbnail_url: _thumbnailUrl, ...record }) => record)
        const { error: legacyError } = await admin.from('media_metrics').upsert(legacyRecords, { onConflict: 'instagram_media_id' })
        if (legacyError) throw legacyError
      } else if (saveError) throw saveError
    }

    return response({ imported: records.length }, 200, allowedOrigin)
  } catch (error) {
    const rawCode = (error as { code?: unknown } | null)?.code
    const safeCode = typeof rawCode === 'string' && /^[A-Z0-9]{1,12}$/i.test(rawCode) ? rawCode : undefined
    const rawMessage = (error as { message?: unknown } | null)?.message
    const typeMatch = typeof rawMessage === 'string'
      ? rawMessage.match(/^(?:invalid input syntax for type|invalid input value for enum) ([a-z0-9_. ]{1,64}):/i)
      : null
    console.error('Instagram sync diagnóstico:', JSON.stringify({
      etapa: stage,
      origen: error instanceof MetaRequestError ? 'meta' : stage === 'guardar_publicaciones' ? 'base_de_datos' : 'procesamiento',
      codigo: error instanceof MetaRequestError ? error.code : safeCode,
      tipo_de_dato: typeMatch?.[1],
      subcodigo: error instanceof MetaRequestError ? error.subcode : undefined,
      estado_http: error instanceof MetaRequestError ? error.httpStatus : undefined,
    }))
    if (error instanceof MetaRequestError && error.code === 190) {
      try {
        await markAuthorizationExpired()
      } catch (updateError) {
        console.error('No se ha podido actualizar el estado de autorización:', updateError instanceof Error ? updateError.message : 'Error desconocido')
        return response({ error: 'No se ha podido actualizar el estado de la autorización. Inténtalo de nuevo.' }, 500, allowedOrigin)
      }
      return response({ error: 'Meta ha caducado o revocado la autorización. La cuenta se conserva; vuelve a autorizarla.' }, 401, allowedOrigin)
    }
    return response({ error: 'No se han podido importar las publicaciones desde Meta.' }, 502, allowedOrigin)
  }
})

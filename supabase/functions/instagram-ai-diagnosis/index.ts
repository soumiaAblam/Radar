import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type MediaMetric = {
  id: string
  title: string | null
  caption: string | null
  media_type: string
  published_at: string | null
  views: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  shares: number | null
}

type Diagnosis = {
  executiveSummary: string
  dataQuality: 'insufficient' | 'limited' | 'ready'
  dataNote: string
  keyFinding: { title: string, finding: string, evidence: string }
  opportunities: Array<{ title: string, insight: string, evidence: string, priority: 'alta' | 'media' }>
  alerts: Array<{ title: string, detail: string, severity: 'info' | 'attention' }>
  experiments: Array<{ title: string, description: string, metric: string, expectedSignal: string }>
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

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function madridDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function weekRange() {
  const today = new Date(`${madridDate()}T12:00:00Z`)
  const day = today.getUTCDay() || 7
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 700) : fallback
}

function list<T>(value: unknown, mapper: (entry: Record<string, unknown>) => T) {
  return Array.isArray(value) ? value.slice(0, 3).filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object').map(mapper) : []
}

function normalizeDiagnosis(value: unknown): Diagnosis {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const quality = data.dataQuality === 'ready' || data.dataQuality === 'limited' ? data.dataQuality : 'insufficient'
  const finding = data.keyFinding && typeof data.keyFinding === 'object' ? data.keyFinding as Record<string, unknown> : {}

  return {
    executiveSummary: text(data.executiveSummary, 'No se ha podido resumir todavía el rendimiento de la cuenta.'),
    dataQuality: quality,
    dataNote: text(data.dataNote, 'Sin suficiente información para una recomendación concluyente.'),
    keyFinding: {
      title: text(finding.title, 'Señal principal'),
      finding: text(finding.finding, 'Necesitamos más publicaciones para confirmar una tendencia.'),
      evidence: text(finding.evidence, 'Basado en los datos disponibles.'),
    },
    opportunities: list(data.opportunities, (entry) => ({
      title: text(entry.title, 'Oportunidad'),
      insight: text(entry.insight, 'Contrasta esta hipótesis con nuevas publicaciones.'),
      evidence: text(entry.evidence, 'Datos disponibles'),
      priority: entry.priority === 'alta' ? 'alta' : 'media',
    })),
    alerts: list(data.alerts, (entry) => ({
      title: text(entry.title, 'A tener en cuenta'),
      detail: text(entry.detail, 'Revisa esta señal antes de tomar decisiones.'),
      severity: entry.severity === 'attention' ? 'attention' : 'info',
    })),
    experiments: list(data.experiments, (entry) => ({
      title: text(entry.title, 'Prueba una hipótesis'),
      description: text(entry.description, 'Haz una prueba controlada durante la próxima semana.'),
      metric: text(entry.metric, 'Engagement'),
      expectedSignal: text(entry.expectedSignal, 'Busca una mejora frente a tu media.'),
    })),
  }
}

function schema() {
  const shortText = { type: 'string', maxLength: 700 }
  return {
    type: 'object',
    properties: {
      executiveSummary: shortText,
      dataQuality: { type: 'string', enum: ['insufficient', 'limited', 'ready'] },
      dataNote: shortText,
      keyFinding: {
        type: 'object', properties: { title: shortText, finding: shortText, evidence: shortText }, required: ['title', 'finding', 'evidence'],
      },
      opportunities: {
        type: 'array', maxItems: 3, items: {
          type: 'object', properties: { title: shortText, insight: shortText, evidence: shortText, priority: { type: 'string', enum: ['alta', 'media'] } }, required: ['title', 'insight', 'evidence', 'priority'],
        },
      },
      alerts: {
        type: 'array', maxItems: 3, items: {
          type: 'object', properties: { title: shortText, detail: shortText, severity: { type: 'string', enum: ['info', 'attention'] } }, required: ['title', 'detail', 'severity'],
        },
      },
      experiments: {
        type: 'array', maxItems: 3, items: {
          type: 'object', properties: { title: shortText, description: shortText, metric: shortText, expectedSignal: shortText }, required: ['title', 'description', 'metric', 'expectedSignal'],
        },
      },
    },
    required: ['executiveSummary', 'dataQuality', 'dataNote', 'keyFinding', 'opportunities', 'alerts', 'experiments'],
  }
}

function buildDataset(metrics: MediaMetric[]) {
  const totals = metrics.reduce((result, metric) => ({
    views: result.views + number(metric.views),
    interactions: result.interactions + number(metric.likes) + number(metric.comments) + number(metric.saves) + number(metric.shares),
    saves: result.saves + number(metric.saves),
    shares: result.shares + number(metric.shares),
  }), { views: 0, interactions: 0, saves: 0, shares: 0 })

  return {
    publicationCount: metrics.length,
    totals,
    averageViews: metrics.length ? Math.round(totals.views / metrics.length) : 0,
    averageEngagement: totals.views ? Number(((totals.interactions / totals.views) * 100).toFixed(2)) : 0,
    publications: metrics.map((metric) => ({
      format: metric.media_type,
      publishedAt: metric.published_at,
      title: text(metric.title || metric.caption?.split('\n')[0], 'Publicación'),
      views: number(metric.views),
      likes: number(metric.likes),
      comments: number(metric.comments),
      saves: number(metric.saves),
      shares: number(metric.shares),
    })),
  }
}

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? ''
  const requestOrigin = request.headers.get('Origin') ?? ''
  const allowedOrigin = requestOrigin === appOrigin || requestOrigin === 'http://localhost:5173' || requestOrigin === 'http://127.0.0.1:5173'
    ? requestOrigin
    : appOrigin

  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigin, ...corsHeaders } })
  if (request.method !== 'POST') return response({ error: 'Método no permitido.' }, 405, allowedOrigin)

  const authorization = request.headers.get('Authorization')
  const userToken = authorization?.replace(/^Bearer\s+/i, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!userToken || !supabaseUrl || !serviceRoleKey) return response({ error: 'No se ha podido validar la sesión.' }, 401, allowedOrigin)

  const { accountId, force = false } = await request.json().catch(() => ({ accountId: '', force: false })) as { accountId?: string, force?: boolean }
  if (!accountId) return response({ error: 'Selecciona una cuenta de Instagram.' }, 400, allowedOrigin)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await admin.auth.getUser(userToken)
  if (userError || !userData.user) return response({ error: 'La sesión ha caducado.' }, 401, allowedOrigin)

  const { data: account, error: accountError } = await admin
    .from('instagram_accounts')
    .select('id, username, auth_provider')
    .eq('id', accountId)
    .eq('user_id', userData.user.id)
    .eq('connection_status', 'connected')
    .maybeSingle()
  if (accountError || !account) return response({ error: 'La cuenta no está disponible para analizar.' }, 404, allowedOrigin)
  if (account.auth_provider === 'instagram') {
    return response({ error: 'El análisis IA requiere una cuenta avanzada con métricas de Meta.' }, 403, allowedOrigin)
  }

  const week = weekRange()
  const { data: savedDiagnosis } = await admin
    .from('weekly_diagnoses')
    .select('analysis, generated_at')
    .eq('account_id', account.id)
    .eq('week_start', week.start)
    .eq('status', 'ready')
    .maybeSingle()
  if (savedDiagnosis && !force) return response({ diagnosis: savedDiagnosis.analysis, generatedAt: savedDiagnosis.generated_at, cached: true }, 200, allowedOrigin)

  if (!geminiKey) return response({ error: 'El agente de IA aún no está configurado. Añade GEMINI_API_KEY en los secretos de Supabase.' }, 503, allowedOrigin)

  const { data: metrics, error: metricsError } = await admin
    .from('media_metrics')
    .select('id, title, caption, media_type, published_at, views, likes, comments, saves, shares')
    .eq('account_id', account.id)
    .order('published_at', { ascending: false })
    .limit(40)
  if (metricsError) return response({ error: 'No se han podido leer las métricas de la cuenta.' }, 500, allowedOrigin)
  if (!metrics?.length) return response({ error: 'Sin publicaciones sincronizadas. Sincroniza publicaciones antes de generar el análisis.' }, 422, allowedOrigin)

  const dataset = buildDataset(metrics as MediaMetric[])
  const now = new Date().toISOString()
  await admin.from('weekly_diagnoses').upsert({ account_id: account.id, week_start: week.start, week_end: week.end, status: 'pending', analysis: {}, provider: 'gemini' }, { onConflict: 'account_id,week_start' })

  try {
    // Gemini 2.5 is only available to projects that used it previously.
    // Flash-Lite is the current free-tier option for new Gemini API projects.
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Eres la analista estratégica de Retorika RADAR. Responde siempre en español de España. Analiza solo los datos proporcionados; no inventes métricas, tendencias ni causas. Si la muestra es pequeña, dilo claramente. Da recomendaciones concretas, comprobables y prudentes para una cuenta de Instagram. No menciones que eres una IA ni expongas títulos o textos completos de publicaciones.' }],
        },
        contents: [{ role: 'user', parts: [{ text: `Analiza esta cuenta de Instagram para la semana ${week.start} a ${week.end}. Devuelve únicamente el JSON solicitado. Datos de @${account.username}:\n${JSON.stringify(dataset)}` }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema(), maxOutputTokens: 1800 },
      }),
    })
    const payload = await result.json()
    if (!result.ok) throw new Error(payload?.error?.message ?? 'Gemini no ha podido generar el análisis.')
    const rawText = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
    const diagnosis = normalizeDiagnosis(JSON.parse(rawText ?? '{}'))

    const { error: saveError } = await admin.from('weekly_diagnoses').upsert({
      account_id: account.id, week_start: week.start, week_end: week.end, status: 'ready', analysis: diagnosis, provider: 'gemini', generated_at: now,
    }, { onConflict: 'account_id,week_start' })
    if (saveError) throw saveError
    return response({ diagnosis, generatedAt: now, cached: false }, 200, allowedOrigin)
  } catch (error) {
    await admin.from('weekly_diagnoses').upsert({
      account_id: account.id, week_start: week.start, week_end: week.end, status: 'error', analysis: {}, provider: 'gemini', generated_at: null,
    }, { onConflict: 'account_id,week_start' })
    console.error('Gemini diagnosis error:', error instanceof Error ? error.message : 'Unknown error')
    return response({ error: 'No se ha podido generar el análisis. Comprueba la cuota de Gemini e inténtalo de nuevo.' }, 502, allowedOrigin)
  }
})

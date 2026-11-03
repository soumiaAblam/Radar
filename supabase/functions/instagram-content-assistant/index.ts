import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const objectives: Record<string, string> = { sell: 'vender', inform: 'informar', students: 'captar alumnos', engagement: 'generar interacción', event: 'promocionar un evento', other: 'cumplir un objetivo personalizado' }
function response(body: Record<string, unknown>, status = 200, origin = '') { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, ...corsHeaders } }) }
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? ''
  const origin = request.headers.get('Origin') ?? ''
  const allowedOrigin = origin === appOrigin || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' ? origin : appOrigin
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigin, ...corsHeaders } })
  if (request.method !== 'POST') return response({ error: 'Método no permitido.' }, 405, allowedOrigin)

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL'), serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!token || !supabaseUrl || !serviceRoleKey) return response({ error: 'No se ha podido validar la sesión.' }, 401, allowedOrigin)
  if (!geminiKey) return response({ error: 'La asistencia de contenido necesita GEMINI_API_KEY en los secretos de Supabase.' }, 503, allowedOrigin)
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user || auth.user.is_anonymous) return response({ error: 'La sesión ha caducado.' }, 401, allowedOrigin)

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const objective = objectives[clean(body.objective, 30)] ?? 'informar'
  const customObjective = clean(body.customObjective, 240), idea = clean(body.idea, 1200), username = clean(body.username, 80)
  if (!idea) return response({ error: 'Describe primero la idea de la publicación.' }, 422, allowedOrigin)
  try {
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite'
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Eres una asistente editorial de Instagram. Responde en español de España y devuelve exclusivamente JSON. No inventes datos ni promesas. La descripción debe ser clara, humana y apta para una cuenta profesional. Máximo 2200 caracteres, máximo 30 hashtags y una llamada a la acción breve.' }] },
        contents: [{ role: 'user', parts: [{ text: `Para @${username || 'cuenta'} crea una propuesta cuyo objetivo es ${objective}${customObjective ? `: ${customObjective}` : ''}. Idea: ${idea}` }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { description: { type: 'string', maxLength: 2200 }, hashtags: { type: 'string', maxLength: 500 }, cta: { type: 'string', maxLength: 180 } }, required: ['description', 'hashtags', 'cta'] }, maxOutputTokens: 1000 },
      }),
    })
    const payload = await result.json()
    if (!result.ok) throw new Error(payload?.error?.message ?? 'Gemini no ha podido generar el texto.')
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
    const generated = JSON.parse(text ?? '{}') as Record<string, unknown>
    const tags = clean(generated.hashtags, 500).split(/\s+/).filter((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag)).slice(0, 30).join(' ')
    return response({ description: clean(generated.description, 2200), hashtags: tags, cta: clean(generated.cta, 180) }, 200, allowedOrigin)
  } catch (error) {
    console.error('Content assistant error:', error instanceof Error ? error.message : 'Unknown error')
    return response({ error: 'No se ha podido generar la propuesta. Comprueba la cuota de Gemini e inténtalo de nuevo.' }, 502, allowedOrigin)
  }
})

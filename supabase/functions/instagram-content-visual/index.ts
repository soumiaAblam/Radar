import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
function response(body: Record<string, unknown>, status = 200, origin = '') { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, ...corsHeaders } }) }

Deno.serve(async (request) => {
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? '', origin = request.headers.get('Origin') ?? ''
  const allowedOrigin = origin === appOrigin || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' ? origin : appOrigin
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigin, ...corsHeaders } })
  if (request.method !== 'POST') return response({ error: 'Método no permitido.' }, 405, allowedOrigin)
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, ''), supabaseUrl = Deno.env.get('SUPABASE_URL'), serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!token || !supabaseUrl || !serviceRoleKey) return response({ error: 'No se ha podido validar la sesión.' }, 401, allowedOrigin)
  const admin = createClient(supabaseUrl, serviceRoleKey); const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user || auth.user.is_anonymous) return response({ error: 'La sesión ha caducado.' }, 401, allowedOrigin)
  const body = await request.json().catch(() => ({})) as { prompt?: string, mediaType?: string }
  const prompt = body.prompt?.trim().slice(0, 1200)
  if (!prompt) return response({ error: 'Describe el visual que quieres generar.' }, 422, allowedOrigin)
  if (body.mediaType === 'video') return response({ error: 'La generación de vídeo requiere configurar un proveedor de vídeo. Mientras tanto, importa un vídeo propio.' }, 422, allowedOrigin)
  if (!geminiKey) return response({ error: 'La generación visual necesita GEMINI_API_KEY en los secretos de Supabase.' }, 503, allowedOrigin)
  try {
    const model = Deno.env.get('GEMINI_IMAGE_MODEL') ?? 'gemini-2.5-flash-image'
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Crea una imagen vertical 4:5 para una publicación profesional de Instagram. Sin texto legible, logotipos ni marcas registradas. Estilo cuidado y contemporáneo. Brief: ${prompt}` }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) })
    const payload = await result.json(); if (!result.ok) throw new Error(payload?.error?.message ?? 'Gemini no ha podido generar la imagen.')
    const image = payload?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: string, mimeType?: string } }) => part.inlineData?.data)?.inlineData
    if (!image?.data) throw new Error('El modelo no ha devuelto una imagen.')
    return response({ previewUrl: `data:${image.mimeType ?? 'image/png'};base64,${image.data}` }, 200, allowedOrigin)
  } catch (error) {
    console.error('Content visual error:', error instanceof Error ? error.message : 'Unknown error')
    return response({ error: 'No se ha podido generar la imagen. Comprueba GEMINI_IMAGE_MODEL y la cuota disponible.' }, 502, allowedOrigin)
  }
})

import { admin, headers, json, ownsAccount, userFor } from '../_shared/drive.ts'

// Google indica que thumbnailLink es temporal; se obtiene y se sirve desde el servidor.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: headers(request) })
  if (request.method !== 'POST') return json(request, { error: 'Método no permitido.' }, 405)
  const user = await userFor(request)
  if (!user) return json(request, { error: 'Sesión no válida.' }, 401)
  try {
    const { accountId, contentId } = await request.json()
    if (typeof accountId !== 'string' || typeof contentId !== 'string' || !await ownsAccount(user.id, accountId)) return json(request, { error: 'Cuenta no disponible.' }, 403)
    const { data: item, error } = await admin().from('editorial_content').select('drive_file_id,drive_url').eq('account_id', accountId).eq('id', contentId).maybeSingle()
    if (error || !item || !/^[A-Za-z0-9_-]{1,200}$/.test(item.drive_file_id || '')) return json(request, { thumbnail: null })
    const apiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    if (!apiKey) return json(request, { thumbnail: null })
    const requestHeaders: Record<string, string> = { 'X-Goog-Api-Key': apiKey }
    try {
      const key = new URL(item.drive_url).searchParams.get('resourcekey')
      if (key && /^[A-Za-z0-9_-]{1,200}$/.test(key)) requestHeaders['X-Goog-Drive-Resource-Keys'] = `${item.drive_file_id}/${key}`
    } catch { /* Los enlaces antiguos pueden estar vacíos. */ }
    const metadata = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.drive_file_id)}?fields=thumbnailLink`, { headers: requestHeaders })
    if (!metadata.ok) return json(request, { thumbnail: null })
    const { thumbnailLink } = await metadata.json()
    if (typeof thumbnailLink !== 'string') return json(request, { thumbnail: null })
    let url = new URL(thumbnailLink)
    let response: Response | undefined
    for (let i = 0; i < 3; i++) {
      if (url.protocol !== 'https:' || url.username || url.password || !/^[a-z0-9-]+\.googleusercontent\.com$/i.test(url.hostname)) return json(request, { thumbnail: null })
      response = await fetch(url, { redirect: 'manual' })
      if (response.status < 300 || response.status >= 400) break
      const location = response.headers.get('location')
      if (!location) return json(request, { thumbnail: null })
      url = new URL(location, url)
    }
    const type = response?.headers.get('content-type')?.split(';')[0].toLowerCase()
    const limit = 512 * 1024
    if (!response?.ok || !type || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type) || Number(response.headers.get('content-length') || 0) > limit || !response.body) return json(request, { thumbnail: null })
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) { await reader.cancel(); return json(request, { thumbnail: null }) }
      chunks.push(value)
    }
    let binary = ''
    for (const chunk of chunks) for (let i = 0; i < chunk.length; i += 8192) binary += String.fromCharCode(...chunk.subarray(i, i + 8192))
    return json(request, { thumbnail: `data:${type};base64,${btoa(binary)}` })
  } catch {
    return json(request, { thumbnail: null })
  }
})

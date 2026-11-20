import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
export function headers(request: Request) {
  const origin = request.headers.get('origin') || ''
  const appOrigin = Deno.env.get('APP_ORIGIN') || ''
  const allowed = [appOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin) ? origin : appOrigin
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
}
export function json(request: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...headers(request), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }) }
export function configured() { return ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GOOGLE_DRIVE_CLIENT_ID','GOOGLE_DRIVE_CLIENT_SECRET','GOOGLE_DRIVE_REDIRECT_URI','DRIVE_TOKEN_ENCRYPTION_KEY','APP_ORIGIN'].every((name) => Boolean(Deno.env.get(name))) }
export async function userFor(request: Request) {
  const bearer = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!bearer) return null
  const { data, error } = await admin().auth.getUser(bearer)
  return error || !data.user || data.user.is_anonymous ? null : data.user
}
export async function ownsAccount(userId: string, accountId: string) {
  const { data, error } = await admin().from('instagram_accounts').select('id').eq('id', accountId).eq('user_id', userId).maybeSingle()
  return !error && Boolean(data)
}
export function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','') }
export async function digest(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))) }
async function encryptionKey() {
  const raw = Uint8Array.from(atob(Deno.env.get('DRIVE_TOKEN_ENCRYPTION_KEY') || ''), (char) => char.charCodeAt(0))
  if (raw.length !== 32) throw new Error('Invalid encryption key')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt'])
}
export async function encrypt(token: string, accountId: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: new TextEncoder().encode(accountId) }, await encryptionKey(), new TextEncoder().encode(token))
  return `${btoa(String.fromCharCode(...nonce))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`
}
export async function decrypt(value: string, accountId: string) {
  const [iv, ciphertext] = value.split('.')
  const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(iv), (char) => char.charCodeAt(0)), additionalData: new TextEncoder().encode(accountId) }, await encryptionKey(), Uint8Array.from(atob(ciphertext), (char) => char.charCodeAt(0)))
  return new TextDecoder().decode(decoded)
}
export async function accessToken(accountId: string) {
  const { data, error } = await admin().from('drive_connections').select('refresh_token_ciphertext').eq('account_id', accountId).maybeSingle()
  if (error || !data) throw new Error('NOT_CONNECTED')
  const refreshToken = await decrypt(data.refresh_token_ciphertext, accountId)
  const response = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id:Deno.env.get('GOOGLE_DRIVE_CLIENT_ID')!, client_secret:Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET')!, refresh_token:refreshToken, grant_type:'refresh_token' }) })
  const dataToken = await response.json()
  if (!response.ok || typeof dataToken.access_token !== 'string') throw new Error('TOKEN_REFRESH_FAILED')
  return dataToken.access_token as string
}
export async function googleGet(url: URL, token: string, resourceKeys: { id:string; key:string }[] = []) {
  const requestHeaders: Record<string, string> = { Authorization:`Bearer ${token}` }
  const keys = resourceKeys.filter(({ id, key }) => /^[A-Za-z0-9_-]{1,200}$/.test(id) && /^[A-Za-z0-9_-]{1,200}$/.test(key))
  if (keys.length) requestHeaders['X-Goog-Drive-Resource-Keys'] = keys.map(({ id, key }) => `${id}/${key}`).join(',')
  const response = await fetch(url, { headers:requestHeaders })
  if (!response.ok) throw new Error(`DRIVE_HTTP_${response.status}`)
  return await response.json()
}

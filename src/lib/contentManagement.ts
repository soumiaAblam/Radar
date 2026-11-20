export type ContentStatus = 'pending' | 'selected' | 'editing' | 'scheduled' | 'published'
export type ContentEvent = { id: string; account_id: string; name: string; event_date: string | null; location: string }
export type ContentItem = { id: string; account_id: string; event_id: string | null; title: string; description: string; topics: string[]; recording_date: string | null; drive_url: string; drive_file_id: string | null; drive_folder_id?: string | null; drive_folder_path?: string; drive_source_name?: string | null; drive_file_created_at?: string | null; drive_sort_order?: number | null; thumbnail_url: string; status: ContentStatus; scheduled_date: string | null; scheduled_time: string | null; published_at: string | null; instagram_url: string; notes: string; created_at: string }
export type EditorialSettings = { timezone: string; avoid_consecutive_event: boolean; min_event_days: number; warn_topic: boolean; max_per_day: number }
export const defaultSettings: EditorialSettings = { timezone: 'Europe/Madrid', avoid_consecutive_event: true, min_event_days: 0, warn_topic: true, max_per_day: 1 }
export const statusNames: Record<ContentStatus, string> = { pending: 'Pendiente', selected: 'Seleccionado', editing: 'En edición', scheduled: 'Programado', published: 'Publicado' }

/** Conserva también la clave de acceso incluida en algunos enlaces compartidos. */
export function parseDriveFolder(value: string): { id:string; resourceKey:string | null } | null {
  const input = value.trim()
  const validPart = /^[A-Za-z0-9_-]{1,200}$/
  if (validPart.test(input)) return { id:input, resourceKey:null }
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.username || url.password) return null
    const id = url.pathname.match(/\/folders\/([A-Za-z0-9_-]{1,200})(?:\/|$)/)?.[1]
    const keys = [...url.searchParams.entries()].filter(([name]) => name.toLowerCase() === 'resourcekey').map(([, key]) => key)
    if (!id || keys.length > 1 || (keys.length === 1 && !validPart.test(keys[0]))) return null
    return { id, resourceKey:keys[0] || null }
  } catch { return null }
}

/** Solo se aceptan enlaces HTTPS de Google Drive, nunca protocolos o dominios parecidos. */
export function parseDriveUrl(value: string): { valid: boolean; id: string | null } {
  if (!value.trim()) return { valid: true, id: null }
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.username || url.password) return { valid: false, id: null }
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : null)
    return { valid: Boolean(id && /^[\w-]+$/.test(id)), id: id || null }
  } catch { return { valid: false, id: null } }
}

export function editorialWarnings(candidate: ContentItem, items: ContentItem[], settings: EditorialSettings): string[] {
  if (!candidate.scheduled_date || !candidate.scheduled_time) return []
  const others = items.filter((item) => item.id !== candidate.id && (item.status === 'scheduled' || item.status === 'published') && item.scheduled_date && item.scheduled_time)
  const sorted = [...others, candidate].sort((a, b) => `${a.scheduled_date}T${a.scheduled_time}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time}`) || a.id.localeCompare(b.id))
  const position = sorted.indexOf(candidate)
  const adjacent = [sorted[position - 1], sorted[position + 1]].filter(Boolean)
  const warnings: string[] = []
  if (settings.avoid_consecutive_event && candidate.event_id && adjacent.some((item) => item.event_id === candidate.event_id)) warnings.push('Hay publicaciones consecutivas del mismo evento.')
  if (settings.min_event_days && candidate.event_id && others.some((item) => item.event_id === candidate.event_id && Math.abs(Date.parse(`${item.scheduled_date}T00:00:00Z`) - Date.parse(`${candidate.scheduled_date}T00:00:00Z`)) < settings.min_event_days * 86400000)) warnings.push(`Hay otro vídeo del mismo evento a menos de ${settings.min_event_days} días.`)
  if (settings.warn_topic && candidate.topics.length && adjacent.some((item) => item.topics.some((topic) => candidate.topics.some((own) => own.toLocaleLowerCase() === topic.toLocaleLowerCase())))) warnings.push('Hay publicaciones consecutivas con la misma temática.')
  const sameDay = others.filter((item) => item.scheduled_date === candidate.scheduled_date)
  if (sameDay.length >= settings.max_per_day) warnings.push(`Se supera el máximo recomendado de ${settings.max_per_day} por día.`)
  if (sameDay.some((item) => item.scheduled_time?.slice(0, 5) === candidate.scheduled_time?.slice(0, 5))) warnings.push('Ya hay otra publicación a la misma hora.')
  return warnings
}

export function dayKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

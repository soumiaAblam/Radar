import { dayKey, type ContentItem } from './contentManagement'

export function dayInTimeZone(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const part = (name: string) => parts.find((value) => value.type === name)?.value || ''
    return `${part('year')}-${part('month')}-${part('day')}`
  } catch { return dayKey(now) }
}

export function scheduledVideos(items: ContentItem[], today: string, mode: 'today' | 'upcoming'): ContentItem[] {
  return items.filter((item) => item.media_kind !== 'image' && item.status === 'scheduled' && item.scheduled_date && (mode === 'today' ? item.scheduled_date === today : item.scheduled_date >= today))
    .sort((a, b) => `${a.scheduled_date}T${a.scheduled_time || ''}`.localeCompare(`${b.scheduled_date}T${b.scheduled_time || ''}`) || a.title.localeCompare(b.title, 'es'))
}

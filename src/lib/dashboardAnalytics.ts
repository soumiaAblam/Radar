import type { DailyMetrics } from '../types/metrics'

export type DashboardPost = {
  id: string
  title: string
  publishedAt: string | null
  format: string
  views: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  shares: number | null
  thumbnail: string | null
  source: 'instagram' | 'manual'
}

export const interactionCount = (post: DashboardPost) =>
  (post.likes ?? 0) + (post.comments ?? 0) + (post.saves ?? 0) + (post.shares ?? 0)

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthlyFollowers(records: DailyMetrics[], now = new Date()) {
  const sorted = [...records].filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date)).sort((a, b) => a.date.localeCompare(b.date))
  const today = localDateKey(now)
  const currentStart = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1))
  const previousStart = localDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const beforePreviousStart = localDateKey(new Date(now.getFullYear(), now.getMonth() - 2, 1))
  const current = sorted.filter((r) => r.date <= today).at(-1)
  const atCurrentStart = sorted.filter((r) => r.date <= currentStart).at(-1)
  const atPreviousStart = sorted.filter((r) => r.date <= previousStart).at(-1)
  const atBeforePreviousStart = sorted.filter((r) => r.date <= beforePreviousStart).at(-1)
  // No se extrapola desde registros antiguos: cada límite necesita una lectura exacta.
  const value = current && atCurrentStart?.date === currentStart ? current.followers - atCurrentStart.followers : null
  const previous = atCurrentStart?.date === currentStart && atPreviousStart?.date === previousStart
    ? atCurrentStart.followers - atPreviousStart.followers : null
  const beforePrevious = atPreviousStart?.date === previousStart && atBeforePreviousStart?.date === beforePreviousStart
    ? atPreviousStart.followers - atBeforePreviousStart.followers : null
  return { value, previous, beforePrevious, lastDate: current?.date ?? null }
}

export function monthlyPublicationCounts(posts: DashboardPost[], now = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      label: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date).replace('.', ''),
      count: posts.filter((post) => post.publishedAt?.slice(0, 7) === key).length,
    }
  })
}

export function standoutPosts(posts: DashboardPost[]) {
  const definitions = [
    { key: 'comments' as const, label: 'Más comentarios' },
    { key: 'views' as const, label: 'Más visualizaciones' },
    { key: 'likes' as const, label: 'Más likes' },
  ]
  const grouped = new Map<string, { post: DashboardPost, reasons: string[] }>()
  for (const { key, label } of definitions) {
    const maximum = Math.max(0, ...posts.map((post) => post[key] ?? 0))
    if (!maximum) continue
    for (const post of posts.filter((item) => item[key] === maximum)) {
      const entry = grouped.get(post.id) ?? { post, reasons: [] }
      entry.reasons.push(label)
      grouped.set(post.id, entry)
    }
  }
  return [...grouped.values()]
}

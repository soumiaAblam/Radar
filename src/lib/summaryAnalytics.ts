import type { DailyMetrics } from '../types/metrics'

type ComparedMetric = {
  id: 'followers' | 'reach' | 'views' | 'likes' | 'saves' | 'shares'
  label: string
  current: number
  previous: number
  change: number
  percentage: number | null
}

export type SummaryAnalysis = {
  ready: boolean
  comparedMetrics: ComparedMetric[]
  achievements: ComparedMetric[]
  alerts: ComparedMetric[]
  recommendations: string[]
  opportunities: string[]
}

export type GoalSuggestion = {
  id: string
  label: string
  target: number
  current: number
  unit: string
}

const metricsToCompare: Array<{ id: ComparedMetric['id']; label: string }> = [
  { id: 'followers', label: 'Seguidores' },
  { id: 'reach', label: 'Alcance' },
  { id: 'views', label: 'Visualizaciones' },
  { id: 'likes', label: 'Likes' },
  { id: 'saves', label: 'Guardados' },
  { id: 'shares', label: 'Compartidos' },
]

function ordered(records: DailyMetrics[]) {
  return [...records].sort((first, second) => first.date.localeCompare(second.date))
}

function sum(records: DailyMetrics[], field: Exclude<keyof DailyMetrics, 'date' | 'followers'>) {
  return records.reduce((total, record) => total + record[field], 0)
}

export function createSummaryAnalysis(records: DailyMetrics[]): SummaryAnalysis {
  const sortedRecords = ordered(records)
  if (sortedRecords.length < 14) {
    return { ready: false, comparedMetrics: [], achievements: [], alerts: [], recommendations: [], opportunities: [] }
  }

  const previousWeek = sortedRecords.slice(-14, -7)
  const currentWeek = sortedRecords.slice(-7)
  const comparedMetrics = metricsToCompare.map(({ id, label }) => {
    const current = id === 'followers' ? currentWeek.at(-1)!.followers - currentWeek[0].followers : sum(currentWeek, id)
    const previous = id === 'followers' ? previousWeek.at(-1)!.followers - previousWeek[0].followers : sum(previousWeek, id)
    const change = current - previous
    return { id, label, current, previous, change, percentage: previous === 0 ? null : (change / Math.abs(previous)) * 100 }
  })
  const achievements = comparedMetrics.filter((metric) => metric.change > 0).sort((first, second) => second.change - first.change)
  const alerts = comparedMetrics.filter((metric) => metric.change < 0).sort((first, second) => first.change - second.change)
  const reach = comparedMetrics.find((metric) => metric.id === 'reach')!
  const saves = comparedMetrics.find((metric) => metric.id === 'saves')!
  const reelsCurrent = sum(currentWeek, 'reels')
  const carouselsCurrent = sum(currentWeek, 'carousels')
  const recommendations: string[] = []
  const opportunities: string[] = []

  if (reach.change > 0) recommendations.push(`El alcance semanal creció ${Math.round(reach.percentage ?? 0)} % (${reach.current.toLocaleString('es-ES')} frente a ${reach.previous.toLocaleString('es-ES')}). Mantén las acciones de distribución de esta semana y registra el formato de cada publicación para saber cuál contribuyó al resultado.`)
  if (saves.change < 0) recommendations.push(`Los guardados bajaron ${Math.abs(Math.round(saves.percentage ?? 0))} % (${saves.current.toLocaleString('es-ES')} frente a ${saves.previous.toLocaleString('es-ES')}). Prioriza contenido práctico con una llamada clara a guardar y compara su rendimiento por formato.`)
  if (reelsCurrent === 0) opportunities.push('No hay reels registrados esta semana. Cuando exista historial de reels, Radar podrá comparar su alcance con carruseles y otros formatos.')
  if (carouselsCurrent === 0) opportunities.push('No hay carruseles registrados esta semana. Registrar este formato permitirá medir si aporta más guardados o compartidos.')
  if (!opportunities.length) opportunities.push('Hay actividad en reels y carruseles. El siguiente paso es guardar métricas por publicación para identificar qué tema y formato generan más resultados.')
  if (!recommendations.length) recommendations.push('No hay variaciones negativas o positivas suficientemente claras en las métricas agregadas. Continúa recopilando datos diarios para confirmar tendencias de varias semanas.')

  return { ready: true, comparedMetrics, achievements, alerts, recommendations, opportunities }
}

export function createGoalSuggestions(records: DailyMetrics[]): GoalSuggestion[] {
  const sortedRecords = ordered(records)
  if (sortedRecords.length < 14) return []
  const currentWeek = sortedRecords.slice(-7)
  const weeklyFollowers = Math.max(currentWeek.at(-1)!.followers - currentWeek[0].followers, 0)
  const weeklyViews = sum(currentWeek, 'views')
  const weeklyReach = sum(currentWeek, 'reach')
  const weeklyReels = sum(currentWeek, 'reels')
  const weeklyCarousels = sum(currentWeek, 'carousels')
  const weeklyStories = sum(currentWeek, 'stories')
  const latest = currentWeek.at(-1)!
  const engagement = latest.reach > 0 ? ((latest.likes + latest.saves + latest.shares) / latest.reach) * 100 : 0

  return [
    { id: 'followers', label: 'Nuevos seguidores', target: Math.max(Math.ceil(weeklyFollowers * 1.1), 1), current: 0, unit: 'seguidores' },
    { id: 'views', label: 'Visualizaciones', target: Math.max(Math.ceil(weeklyViews * 1.1), 1), current: 0, unit: 'visualizaciones' },
    { id: 'reach', label: 'Alcance', target: Math.max(Math.ceil(weeklyReach * 1.1), 1), current: 0, unit: 'personas' },
    { id: 'engagement', label: 'Engagement', target: Number((engagement * 1.1).toFixed(1)), current: 0, unit: '%' },
    { id: 'reels', label: 'Reels', target: Math.max(weeklyReels, 1), current: 0, unit: 'publicaciones' },
    { id: 'carousels', label: 'Carruseles', target: Math.max(weeklyCarousels, 1), current: 0, unit: 'publicaciones' },
    { id: 'stories', label: 'Historias', target: Math.max(weeklyStories, 1), current: 0, unit: 'días' },
  ]
}

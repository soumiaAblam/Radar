import type { DailyMetrics } from '../types/metrics'

const storageKey = 'retorika-radar-daily-metrics'

export function loadDailyMetrics(): DailyMetrics[] {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value ? JSON.parse(value) as DailyMetrics[] : []
  } catch {
    return []
  }
}

export function saveDailyMetrics(records: DailyMetrics[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

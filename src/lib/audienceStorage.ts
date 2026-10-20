import type { AudienceMetrics } from '../types/audience'

const storageKey = 'retorika-radar-audience-metrics'

export function loadAudienceMetrics(): AudienceMetrics[] {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value ? JSON.parse(value) as AudienceMetrics[] : []
  } catch {
    return []
  }
}

export function saveAudienceMetrics(records: AudienceMetrics[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

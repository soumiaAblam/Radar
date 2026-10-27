import type { AudienceMetrics } from '../types/audience'

const legacyStorageKey = 'retorika-radar-audience-metrics'

function storageKey(accountId: string) {
  return `${legacyStorageKey}:${accountId}`
}

export function loadAudienceMetrics(accountId = 'retorika-academy'): AudienceMetrics[] {
  try {
    const value = window.localStorage.getItem(storageKey(accountId))
      ?? (accountId === 'retorika-academy' ? window.localStorage.getItem(legacyStorageKey) : null)
    return value ? JSON.parse(value) as AudienceMetrics[] : []
  } catch {
    return []
  }
}

export function saveAudienceMetrics(accountId: string, records: AudienceMetrics[]) {
  window.localStorage.setItem(storageKey(accountId), JSON.stringify(records))
}

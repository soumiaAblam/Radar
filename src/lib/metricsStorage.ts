import type { DailyMetrics } from '../types/metrics'

const legacyStorageKey = 'retorika-radar-daily-metrics'

function storageKey(accountId: string) {
  return `${legacyStorageKey}:${accountId}`
}

export function loadDailyMetrics(accountId = 'retorika-academy'): DailyMetrics[] {
  try {
    const value = window.localStorage.getItem(storageKey(accountId))
      ?? (accountId === 'retorika-academy' ? window.localStorage.getItem(legacyStorageKey) : null)
    return value ? JSON.parse(value) as DailyMetrics[] : []
  } catch {
    return []
  }
}

export function saveDailyMetrics(accountId: string, records: DailyMetrics[]) {
  window.localStorage.setItem(storageKey(accountId), JSON.stringify(records))
}

import type { PublicationRecord } from '../types/publication'

const legacyStorageKey = 'retorika-radar-publications'

function storageKey(accountId: string) {
  return `${legacyStorageKey}:${accountId}`
}

export function loadPublicationRecords(accountId = 'retorika-academy'): PublicationRecord[] {
  try {
    const value = window.localStorage.getItem(storageKey(accountId))
      ?? (accountId === 'retorika-academy' ? window.localStorage.getItem(legacyStorageKey) : null)
    return value ? JSON.parse(value) as PublicationRecord[] : []
  } catch {
    return []
  }
}

export function savePublicationRecords(accountId: string, records: PublicationRecord[]) {
  window.localStorage.setItem(storageKey(accountId), JSON.stringify(records))
}

import type { PublicationRecord } from '../types/publication'

const storageKey = 'retorika-radar-publications'

export function loadPublicationRecords(): PublicationRecord[] {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value ? JSON.parse(value) as PublicationRecord[] : []
  } catch {
    return []
  }
}

export function savePublicationRecords(records: PublicationRecord[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

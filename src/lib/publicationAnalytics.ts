import type { PublicationFiltersState, PublicationFormat, PublicationRecord, PublicationRecordInput } from '../types/publication'

export function calculateEngagement(record: Pick<PublicationRecordInput, 'views' | 'likes' | 'comments' | 'saves' | 'shares'>) {
  if (!record.views) return 0
  return ((record.likes + record.comments + record.saves + record.shares) / record.views) * 100
}

export function createPublicationRecord(input: PublicationRecordInput): PublicationRecord {
  return { ...input, id: `publication-${Date.now()}`, engagement: calculateEngagement(input) }
}

export function getAverageEngagement(records: PublicationRecord[]) {
  if (!records.length) return 0
  return records.reduce((total, record) => total + record.engagement, 0) / records.length
}

export function filterAndSortPublications(records: PublicationRecord[], filters: PublicationFiltersState) {
  const today = new Date()
  const minimumDate = new Date(today)
  if (filters.period !== 'all') minimumDate.setDate(today.getDate() - Number(filters.period))

  const filtered = records.filter((record) => {
    const matchesFormat = filters.format === 'all' || record.format === filters.format
    const matchesTopic = filters.topic === 'all' || record.topic === filters.topic
    const matchesPeriod = filters.period === 'all' || new Date(`${record.date}T00:00:00`) >= minimumDate
    return matchesFormat && matchesTopic && matchesPeriod
  })

  return filtered.sort((first, second) => {
    if (filters.sort === 'recent') return second.date.localeCompare(first.date) || (second.time ?? '').localeCompare(first.time ?? '')
    return second[filters.sort] - first[filters.sort]
  })
}

export function getFormatComparison(records: PublicationRecord[]) {
  const formats: PublicationFormat[] = ['reel', 'carousel', 'image', 'story']
  return formats.map((format) => {
    const matchingRecords = records.filter((record) => record.format === format)
    const totalViews = matchingRecords.reduce((total, record) => total + record.views, 0)
    const totalSaves = matchingRecords.reduce((total, record) => total + record.saves, 0)
    return { format, count: matchingRecords.length, averageViews: matchingRecords.length ? totalViews / matchingRecords.length : 0, averageSaves: matchingRecords.length ? totalSaves / matchingRecords.length : 0 }
  }).filter((comparison) => comparison.count)
}

export function getBestTiming(records: PublicationRecord[]) {
  const byDay = new Map<string, { total: number, count: number }>()
  const byTime = new Map<string, { total: number, count: number }>()

  records.forEach((record) => {
    const day = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date(`${record.date}T12:00:00`))
    const dayValues = byDay.get(day) ?? { total: 0, count: 0 }
    byDay.set(day, { total: dayValues.total + record.engagement, count: dayValues.count + 1 })
    if (record.time) {
      const timeValues = byTime.get(record.time) ?? { total: 0, count: 0 }
      byTime.set(record.time, { total: timeValues.total + record.engagement, count: timeValues.count + 1 })
    }
  })

  const bestFrom = (values: Map<string, { total: number, count: number }>) => [...values.entries()].sort((first, second) => (second[1].total / second[1].count) - (first[1].total / first[1].count))[0]?.[0]
  return { day: bestFrom(byDay), time: bestFrom(byTime) }
}

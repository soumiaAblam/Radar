export type PublicationFormat = 'reel' | 'carousel' | 'image' | 'story'

export type PublicationRecord = {
  id: string
  title: string
  date: string
  time: string
  format: PublicationFormat
  topic: string
  views: number
  likes: number
  comments: number
  saves: number
  shares: number
  engagement: number
}

export type PublicationRecordInput = Omit<PublicationRecord, 'id' | 'engagement'>

export type PublicationFiltersState = {
  format: 'all' | PublicationFormat
  period: 'all' | '7' | '30' | '90'
  topic: string
  sort: 'recent' | 'views' | 'engagement' | 'saves' | 'shares'
}

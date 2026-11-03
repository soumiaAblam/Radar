export type ContentObjective = 'sell' | 'inform' | 'students' | 'engagement' | 'event' | 'other'
export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'pending_authorization' | 'published' | 'error'
export type ContentMediaType = 'image' | 'video'

export type ContentPost = {
  id: string
  objective: ContentObjective
  customObjective: string
  idea: string
  mediaType: ContentMediaType
  visualName: string
  previewUrl?: string
  visualPrompt: string
  description: string
  hashtags: string
  cta: string
  status: ContentStatus
  scheduledFor: string
  authorizedAt?: string
  publishedAt?: string
  previousDescriptions: string[]
  createdAt: string
  updatedAt: string
}

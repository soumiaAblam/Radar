import type { ContentPost } from '../types/contentStudio'

function key(accountId: string) {
  return `retorika-radar-content-studio:${accountId}`
}

export function loadContentPosts(accountId: string): ContentPost[] {
  try {
    const saved = window.localStorage.getItem(key(accountId))
    return saved ? JSON.parse(saved) as ContentPost[] : []
  } catch {
    return []
  }
}

export function saveContentPosts(accountId: string, posts: ContentPost[]) {
  window.localStorage.setItem(key(accountId), JSON.stringify(posts))
}

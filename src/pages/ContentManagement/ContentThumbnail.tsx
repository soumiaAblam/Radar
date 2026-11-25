import { useEffect, useState } from 'react'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { ContentItem } from '../../lib/contentManagement'

const cache = new Map<string, Promise<string | null>>()

export default function ContentThumbnail({ item, accountId }: { item: ContentItem; accountId: string }) {
  const [failedManual, setFailedManual] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => { setFailedManual(false); setPreview(null) }, [item.id, item.thumbnail_url, item.drive_file_id])
  useEffect(() => {
    if ((item.thumbnail_url && !failedManual) || !item.drive_file_id) return
    let active = true
    const key = `${accountId}:${item.id}:${item.drive_file_id}:${item.drive_url}`
    let pending = cache.get(key)
    if (!pending) {
      pending = ensureDemoSession().then(async () => {
        const { data, error } = await supabase.functions.invoke('drive-thumbnail', { body: { accountId, contentId: item.id } })
        return !error && typeof data?.thumbnail === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,/.test(data.thumbnail) ? data.thumbnail as string : null
      }).catch(() => null)
      if (cache.size >= 300) cache.delete(cache.keys().next().value!)
      cache.set(key, pending)
    }
    void pending.then((value) => { if (active) setPreview(value) })
    return () => { active = false }
  }, [accountId, item.id, item.drive_file_id, item.drive_url, item.thumbnail_url, failedManual])
  const source = item.thumbnail_url && !failedManual ? item.thumbnail_url : preview
  return <span className="cm-thumb">{source ? <img src={source} alt="" loading="lazy" onError={() => { if (source === item.thumbnail_url) setFailedManual(true); else setPreview(null) }} /> : <span aria-label="Vista previa no disponible">{item.media_kind === 'image' ? '▧' : '▶'}</span>}</span>
}

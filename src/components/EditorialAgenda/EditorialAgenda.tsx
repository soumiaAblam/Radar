import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RadarAccount } from '../../context/AccountContext'
import { dayInTimeZone, scheduledVideos } from '../../lib/editorialAgenda'
import { defaultSettings, parseDriveUrl, type ContentItem } from '../../lib/contentManagement'
import { useRadarClock } from '../../lib/radarWorkspace'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import './editorial-agenda.css'

type Props = { account: RadarAccount; mode: 'today' | 'upcoming' }

export default function EditorialAgenda({ account, mode }: Props) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [zone, setZone] = useState(defaultSettings.timezone)
  const [loading, setLoading] = useState(account.source === 'instagram')
  const [error, setError] = useState('')
  const now = useRadarClock()
  const today = dayInTimeZone(now, zone)
  useEffect(() => {
    let active = true, version = 0
    const load = async () => {
      const current = ++version
      if (account.source !== 'instagram') { setItems([]); setLoading(false); setError(''); return }
      setLoading(true); setError('')
      try {
        await ensureDemoSession()
        const settings = await supabase.from('content_editorial_settings').select('timezone').eq('account_id', account.id).maybeSingle()
        if (settings.error) throw settings.error
        const nextZone = settings.data?.timezone || defaultSettings.timezone
        const nextToday = dayInTimeZone(new Date(), nextZone)
        const all: ContentItem[] = []
        let offset = 0
        while (true) {
          const result = await supabase.from('editorial_content').select('id,title,description,drive_url,media_kind,status,scheduled_date,scheduled_time').eq('account_id', account.id).eq('status', 'scheduled').gte('scheduled_date', nextToday).order('scheduled_date').order('scheduled_time').order('id').range(offset, offset + 999)
          if (result.error) throw result.error
          const page = (result.data ?? []) as ContentItem[]
          all.push(...page)
          if (page.length < 1000) break
          offset += page.length
        }
        if (active && current === version) { setItems(all); setZone(nextZone) }
      } catch { if (active && current === version) { setItems([]); setError('No se pudo cargar la agenda. Comprueba tu conexión e inténtalo de nuevo.') } }
      finally { if (active && current === version) setLoading(false) }
    }
    void load()
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { active = false; version++; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [account.id, account.source, today])
  const visible = scheduledVideos(items, today, mode)
  return <section className="editorial-agenda" aria-labelledby={`editorial-agenda-${mode}`}><div className="editorial-agenda__heading"><div><h2 id={`editorial-agenda-${mode}`}>{mode === 'today' ? 'Hoy' : 'Próximas publicaciones'}</h2><p>{mode === 'today' ? 'Vídeos previstos para hoy' : 'Vídeos pendientes desde hoy'}</p></div><Link to="/gestion-de-contenidos?vista=calendario">Abrir agenda ↗</Link></div>
    {loading ? <p className="editorial-agenda__empty" role="status">Cargando agenda…</p> : error ? <p className="editorial-agenda__empty editorial-agenda__error" role="alert">{error}</p> : account.source !== 'instagram' ? <p className="editorial-agenda__empty">Selecciona una cuenta conectada para ver su agenda.</p> : !visible.length ? <p className="editorial-agenda__empty">{mode === 'today' ? 'No hay vídeos previstos para hoy.' : 'No hay vídeos previstos para los próximos días.'}</p> : <ul className="editorial-agenda__list">{visible.map((item) => <li key={item.id}><span className="editorial-agenda__icon" aria-hidden="true">▷</span><div><strong>{item.title}</strong><span>{item.scheduled_date === today ? 'Hoy' : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.scheduled_date}T12:00:00Z`))} · {item.scheduled_time?.slice(0, 5)} · {zone}</span></div>{item.drive_url && parseDriveUrl(item.drive_url).valid && <a href={item.drive_url} target="_blank" rel="noopener noreferrer">Abrir archivo ↗</a>}</li>)}</ul>}
    <p className="editorial-agenda__note">Fechas previstas en RADAR; no se publican automáticamente en Instagram.</p>
  </section>
}

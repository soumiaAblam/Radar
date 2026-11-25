import { useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { dayKey, editorialWarnings, statusNames, type ContentItem, type EditorialSettings } from '../../lib/contentManagement'
import { dayInTimeZone } from '../../lib/editorialAgenda'
import { useRadarClock } from '../../lib/radarWorkspace'

type Props = { items: ContentItem[]; settings: EditorialSettings; busy: boolean; available: boolean; eventName: (id: string | null) => string; onDetail: (item: ContentItem) => void; onSchedule: (item: ContentItem, date: string, time: string) => Promise<boolean> }
type Placement = { item: ContentItem; date: string; time: string }
const dragType = 'application/x-radar-content-id'

export default function ContentCalendar({ items, settings, busy, available, eventName, onDetail, onSchedule }: Props) {
  const clock = useRadarClock()
  const today = dayInTimeZone(clock, settings.timezone)
  const [calendarDate, setCalendarDate] = useState(() => new Date(`${today}T12:00:00`))
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [search, setSearch] = useState('')
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [error, setError] = useState('')
  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), mode === 'month' ? 1 : calendarDate.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const days = Array.from({ length: mode === 'month' ? 42 : 7 }, (_, index) => { const date = new Date(start); date.setDate(date.getDate() + index); return date })
  const videos = useMemo(() => items.filter((item) => item.media_kind !== 'image' && `${item.title} ${item.drive_folder_path || ''}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true })), [items, search])
  const begin = (item: ContentItem, date: string) => { if (!available || busy || item.status === 'published') return; setError(''); setPlacement({ item, date, time: item.scheduled_time?.slice(0, 5) || '' }) }
  const startDrag = (event: DragEvent, item: ContentItem) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(dragType, item.id); event.dataTransfer.setData('text/plain', item.id) }
  const warnings = placement?.date && placement.time ? editorialWarnings({ ...placement.item, status: 'scheduled', scheduled_date: placement.date, scheduled_time: placement.time }, items, settings) : []
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!placement || busy) return
    if (!placement.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(placement.time)) { setError('Elige una fecha y una hora válidas.'); return }
    if (placement.date < today) { setError('Elige hoy o una fecha futura para planificar el vídeo.'); return }
    if (warnings.length && !window.confirm(`${warnings.join('\n')}\n\n¿Quieres planificarlo igualmente?`)) return
    if (await onSchedule(placement.item, placement.date, placement.time)) setPlacement(null)
    else setError('No se pudo guardar la planificación. Comprueba la conexión e inténtalo de nuevo.')
  }
  return <section className="cm-panel cm-agenda" aria-labelledby="cm-agenda-title">
    <div className="cm-heading"><div><h2 id="cm-agenda-title">Agenda de publicaciones</h2><p className="cm-agenda__month">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarDate)}</p></div><div className="cm-toolbar"><button type="button" aria-label={mode === 'week' ? 'Semana anterior' : 'Mes anterior'} onClick={() => setCalendarDate(mode === 'week' ? new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() - 7) : new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>←</button><button type="button" onClick={() => setCalendarDate(new Date(`${today}T12:00:00`))}>Hoy</button><button type="button" aria-label={mode === 'week' ? 'Semana siguiente' : 'Mes siguiente'} onClick={() => setCalendarDate(mode === 'week' ? new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 7) : new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>→</button><button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Semana</button><button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Mes</button></div></div>
    <div className="cm-agenda__layout"><div className="cm-agenda__main"><p className="cm-agenda__intro">Arrastra un vídeo a la fecha elegida o pulsa «Elegir fecha».</p><div className="cm-calendar"><div className="cm-calendar__days">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => <span key={index}>{label}</span>)}</div><div className="cm-calendar__grid">{days.map((date) => {
      const key = dayKey(date), dayItems = items.filter((item) => item.scheduled_date === key && (item.status === 'scheduled' || item.status === 'published')).sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
      return <div key={key} className={`cm-day ${date.getMonth() !== calendarDate.getMonth() && mode === 'month' ? 'cm-day--muted' : ''} ${key === today ? 'cm-day--today' : ''}`} onDragOver={(event) => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }} onDrop={(event) => { event.preventDefault(); const item = items.find((entry) => entry.id === event.dataTransfer.getData(dragType)); if (item) begin(item, key) }}><strong>{date.getDate()}{key === today && <span className="cm-day__today"> Hoy</span>}</strong>{dayItems.map((item) => <button type="button" draggable={available && !busy && item.media_kind !== 'image' && item.status !== 'published'} key={item.id} onDragStart={(event) => startDrag(event, item)} onClick={() => onDetail(item)} title={`${item.title} · ${eventName(item.event_id)} · ${statusNames[item.status]}`}>{item.scheduled_time?.slice(0, 5)} {item.title}</button>)}</div>
    })}</div></div></div>
    <aside className="cm-agenda__library" aria-label="Vídeos de la biblioteca"><div className="cm-agenda__library-head"><h3>Biblioteca de vídeos</h3><span>{videos.length} vídeos</span></div><label htmlFor="cm-agenda-search">Buscar vídeo</label><input id="cm-agenda-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título o carpeta" /><div className="cm-agenda__list" tabIndex={0}>{videos.length ? videos.map((item) => <article className="cm-agenda__item" key={item.id} draggable={available && !busy && item.status !== 'published'} onDragStart={(event) => startDrag(event, item)}><span className="cm-agenda__item-icon" aria-hidden="true">▷</span><div><strong>{item.title}</strong><small>{item.drive_folder_path || 'Biblioteca'}{item.scheduled_date ? ` · ${item.scheduled_date}` : ''}</small></div>{item.status === 'published' ? <span className="cm-agenda__published">Publicado</span> : <button type="button" disabled={!available || busy} onClick={() => begin(item, today)}>Elegir fecha</button>}</article>) : <p className="cm-agenda__empty">{search ? 'No hay vídeos que coincidan con la búsqueda.' : 'Añade vídeos a la biblioteca para planificarlos.'}</p>}</div></aside></div>
    {placement && <div className="cm-overlay"><section className="cm-modal cm-modal--small" role="dialog" aria-modal="true" aria-labelledby="cm-plan-title" onKeyDown={(event) => {
      if (event.key === 'Escape' && !busy) { event.stopPropagation(); setPlacement(null) }
      if (event.key === 'Tab') {
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
      }
    }}><div className="cm-heading"><div><h2 id="cm-plan-title">Planificar vídeo</h2><p className="cm-agenda__subject">{placement.item.title}</p></div><button type="button" aria-label="Cerrar" disabled={busy} onClick={() => setPlacement(null)}>×</button></div><form className="cm-form" onSubmit={(event) => void save(event)}><label>Fecha<input type="date" min={today} required autoFocus value={placement.date} onChange={(event) => setPlacement({ ...placement, date: event.target.value })} /></label><label>Hora ({settings.timezone})<input type="time" required value={placement.time} onChange={(event) => setPlacement({ ...placement, time: event.target.value })} /></label><p className="cm-wide cm-agenda__note">Se guardará como fecha prevista en RADAR. No se publicará automáticamente en Instagram.</p>{warnings.length > 0 && <div className="cm-wide cm-agenda__warning" role="status"><strong>Revisa la planificación</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}{error && <p className="cm-wide cm-alert cm-alert--error" role="alert">{error}</p>}<div className="cm-wide cm-agenda__form-actions"><button type="button" disabled={busy} onClick={() => setPlacement(null)}>Cancelar</button><button type="submit" className="cm-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar en la agenda'}</button></div></form></section></div>}
  </section>
}

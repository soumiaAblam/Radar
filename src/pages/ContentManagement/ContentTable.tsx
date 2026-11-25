import { useEffect, useState } from 'react'
import { parseDriveUrl, statusNames, type ContentEvent, type ContentItem, type ContentStatus } from '../../lib/contentManagement'
import ContentThumbnail from './ContentThumbnail'

type Props = {
  items: ContentItem[]; events: ContentEvent[]; accountId: string; selected: string[]; busy: boolean
  onSelect: (id: string, checked: boolean) => void; onSelectPage: (ids: string[], checked: boolean) => void
  onDetail: (item: ContentItem) => void; onEdit: (item: ContentItem) => void; onDuplicate: (item: ContentItem) => void; onRemove: (item: ContentItem) => void
  onStatus: (item: ContentItem, status: ContentStatus) => void; onChoose: (item: ContentItem) => void; onStartEditing: (item: ContentItem) => void
}
const pageSize = 10
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : '—'

export default function ContentTable(props: Props) {
  const { items, events, accountId, selected, busy } = props
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [items])
  const current = Math.min(page, Math.max(0, Math.ceil(items.length / pageSize) - 1))
  const visible = items.slice(current * pageSize, (current + 1) * pageSize)
  return <>
    <div className="cm-table-wrap cm-list-wrap"><table className="cm-table cm-list"><thead><tr>
      <th><input type="checkbox" aria-label="Seleccionar contenidos de esta página" checked={visible.length > 0 && visible.every((item) => selected.includes(item.id))} onChange={(e) => props.onSelectPage(visible.map((item) => item.id), e.target.checked)} /></th>
      <th>Miniatura</th><th>Título</th><th>Descripción</th><th>Evento / lugar</th><th>Grabación</th><th>Drive</th><th>Estado</th><th>Publicación prevista</th><th>Acciones</th>
    </tr></thead><tbody>{visible.map((item) => {
      const event = events.find((entry) => entry.id === item.event_id)
      return <tr key={item.id}>
        <td><input type="checkbox" aria-label={`Seleccionar ${item.title}`} checked={selected.includes(item.id)} onChange={(e) => props.onSelect(item.id, e.target.checked)} /></td>
        <td><button type="button" className="cm-list-preview" aria-label={`Ver detalles de ${item.title}`} onClick={() => props.onDetail(item)}><ContentThumbnail item={item} accountId={accountId} /></button></td>
        <td><button type="button" className="cm-list-title" onClick={() => props.onDetail(item)}>{item.title}</button><div>{item.topics.map((topic) => <span className="cm-topic" key={topic}>{topic}</span>)}</div></td>
        <td className="cm-list-description">{item.description || '—'}</td>
        <td>{event ? <><strong>{event.name}</strong>{event.location && <small className="cm-list-location">{event.location}</small>}</> : '—'}</td>
        <td>{dateLabel(item.recording_date)}</td>
        <td>{item.drive_url && parseDriveUrl(item.drive_url).valid ? <a className="cm-drive-link" href={item.drive_url} target="_blank" rel="noopener noreferrer">Ver en Drive ↗</a> : '—'}</td>
        <td><select className={`cm-status cm-status--${item.status}`} aria-label={`Estado de ${item.title}`} value={item.status} onChange={(e) => props.onStatus(item, e.target.value as ContentStatus)} disabled={busy}>{Object.entries(statusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td>
        <td>{dateLabel(item.scheduled_date)}{item.scheduled_date && item.scheduled_time && <small className="cm-list-location">{item.scheduled_time.slice(0, 5)}</small>}</td>
        <td><div className="cm-list-actions"><button type="button" onClick={() => props.onEdit(item)}>Editar</button><details><summary aria-label={`Más acciones para ${item.title}`}>⋯</summary><div>{item.status === 'pending' && <button type="button" disabled={busy} onClick={() => props.onChoose(item)}>Elegir para publicar</button>}{item.status === 'selected' && <button type="button" disabled={busy} onClick={() => props.onStartEditing(item)}>Empezar edición</button>}<button type="button" onClick={() => props.onDuplicate(item)}>Duplicar</button><button type="button" onClick={() => props.onRemove(item)}>Eliminar</button></div></details></div></td>
      </tr>
    })}</tbody></table></div>
    <div className="cm-list-pagination"><span>Mostrando {current * pageSize + 1}–{Math.min((current + 1) * pageSize, items.length)} de {items.length} contenidos</span><div><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button><span>Página {current + 1} de {Math.ceil(items.length / pageSize)}</span><button type="button" disabled={(current + 1) * pageSize >= items.length} onClick={() => setPage(current + 1)}>Siguiente</button></div></div>
  </>
}

import { Fragment, type ReactNode } from 'react'
import { statusNames, type ContentItem, type ContentStatus } from '../../lib/contentManagement'

type Props = {
  items: ContentItem[]
  selected: string[]
  busy: boolean
  eventName: (id: string | null) => string
  thumbnail: (item: ContentItem) => ReactNode
  onSelect: (id: string, checked: boolean) => void
  onDetail: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
  onDuplicate: (item: ContentItem) => void
  onRemove: (item: ContentItem) => void
  onStatus: (item: ContentItem, status: ContentStatus) => void
  onChoose: (item: ContentItem) => void
  onStartEditing: (item: ContentItem) => void
  groupFolders?: boolean
}

export default function LibraryCards({ items, selected, busy, eventName, thumbnail, onSelect, onDetail, onEdit, onDuplicate, onRemove, onStatus, onChoose, onStartEditing, groupFolders = false }: Props) {
  return <div className="cm-library-grid">{items.map((item, index) => <Fragment key={item.id}>{groupFolders && (index === 0 || (items[index - 1].drive_folder_path || '') !== (item.drive_folder_path || '')) && <h3 className="cm-folder-title">▱ {item.drive_folder_path || 'Añadidos manualmente'}</h3>}<article className="cm-library-card">
    <div className="cm-library-card__image"><button type="button" className="cm-library-card__preview" aria-label={`Ver detalles de ${item.title}`} onClick={() => onDetail(item)}>{thumbnail(item)}</button><label className="cm-library-card__select"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onSelect(item.id, event.target.checked)} aria-label={`Seleccionar ${item.title}`} /></label></div>
    <div className="cm-library-card__body"><div className="cm-library-card__top"><span className="cm-library-card__kind">VÍDEO</span><select className={`cm-status cm-status--${item.status}`} aria-label={`Estado de ${item.title}`} value={item.status} onChange={(event) => onStatus(item, event.target.value as ContentStatus)} disabled={busy}>{Object.entries(statusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <h3>{item.title}</h3><p className="cm-library-card__description">{item.description || 'Sin descripción'}</p>
      <div className="cm-library-card__topics">{item.topics.length ? item.topics.map((topic) => <span className="cm-topic" key={topic}>{topic}</span>) : <span className="cm-topic cm-topic--empty">Sin temática</span>}</div>
      <dl className="cm-library-card__meta"><div><dt>Evento</dt><dd>{eventName(item.event_id)}</dd></div>{item.drive_folder_path && <div><dt>Carpeta</dt><dd>{item.drive_folder_path}</dd></div>}<div><dt>{item.recording_date ? 'Grabación' : 'Archivo creado'}</dt><dd>{item.recording_date || item.drive_file_created_at?.slice(0, 10) || 'Sin fecha'}</dd></div><div><dt>Publicación prevista</dt><dd>{item.scheduled_date ? `${item.scheduled_date}${item.scheduled_time ? ` · ${item.scheduled_time.slice(0, 5)}` : ''}` : 'Sin fecha'}</dd></div></dl>
      {item.status === 'pending' && <button type="button" className="cm-library-card__choose" disabled={busy} onClick={() => onChoose(item)}>✦ Elegir para publicar</button>}{item.status === 'selected' && <button type="button" className="cm-library-card__choose" disabled={busy} onClick={() => onStartEditing(item)}>Empezar edición</button>}
      <div className="cm-library-card__actions"><button type="button" className="cm-library-card__edit" disabled={busy} onClick={() => onEdit(item)}>Editar</button><button type="button" className="cm-library-card__detail" onClick={() => onDetail(item)}>Ver detalles</button><details className="cm-library-card__more"><summary aria-label={`Más opciones de ${item.title}`}>•••</summary><div>{item.drive_url && <a href={item.drive_url} target="_blank" rel="noopener noreferrer">Abrir en Drive ↗</a>}<button type="button" onClick={() => onDuplicate(item)}>Duplicar</button><button type="button" onClick={() => onRemove(item)}>Eliminar</button></div></details></div>
    </div>
  </article></Fragment>)}</div>
}

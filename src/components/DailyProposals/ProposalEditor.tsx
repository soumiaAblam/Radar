import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export type ProposalDraft = { title: string; description: string; hashtags: string; scheduled_for: string | null; editorial_content_id: string | null }
export type LibraryItem = { id: string; title: string; drive_url: string; drive_folder_path: string; media_kind: 'image' | 'video' }
type Props = { accountId: string; initial: ProposalDraft; busy: boolean; saveError: string; onClose: () => void; onSave: (draft: ProposalDraft, authorize: boolean, selected: LibraryItem | null) => Promise<void> }

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function ProposalEditor({ accountId, initial, busy, saveError, onClose, onSave }: Props) {
  const [draft, setDraft] = useState({ ...initial, scheduled_for: localDateTime(initial.scheduled_for) })
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const selected = library.find((item) => item.id === draft.editorial_content_id)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => { previousFocus?.focus() }
  }, [])
  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const items: LibraryItem[] = []
        let offset = 0
        while (true) {
          const result = await supabase.from('editorial_content').select('id,title,drive_url,drive_folder_path,media_kind').eq('account_id', accountId).neq('drive_url', '').order('title').order('id').range(offset, offset + 999)
          if (result.error) throw result.error
          const page = (result.data ?? []) as LibraryItem[]
          items.push(...page)
          if (page.length < 1000) break
          offset += page.length
        }
        if (active) setLibrary(items)
      } catch { if (active) setError('No se pudo cargar la biblioteca. Comprueba tu conexión e inténtalo de nuevo.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [accountId])

  const close = () => { if (!busy && window.confirm('¿Cerrar el editor? Los cambios que no hayas guardado se perderán.')) onClose() }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const authorize = action?.value === 'authorize'
    if (!draft.title.trim() || !draft.description.trim()) { setError('Completa el título y la descripción.'); return }
    const date = draft.scheduled_for ? new Date(draft.scheduled_for) : null
    if (date && Number.isNaN(date.getTime())) { setError('Introduce una fecha y hora válidas.'); return }
    if (authorize && (!date || date.getTime() <= Date.now())) { setError('Para autorizar, elige una fecha y hora futuras.'); return }
    setError('')
    if (draft.editorial_content_id && !selected) { setError('No se encuentra el archivo seleccionado. Elige otro archivo o quita la selección.'); return }
    await onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim(), hashtags: draft.hashtags.trim(), scheduled_for: date?.toISOString() ?? null }, authorize, selected ?? null)
  }
  const filtered = library.filter((item) => `${item.title} ${item.drive_folder_path || ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))

  return <div className="proposal-editor-overlay"><section className="proposal-editor" role="dialog" aria-modal="true" aria-labelledby="proposal-editor-title" onKeyDown={(event) => {
    if (event.key === 'Escape') { event.stopPropagation(); close() }
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')]
      if (!controls.length) return
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
    }
  }}>
    <header className="proposal-editor__header"><div><p>PROPUESTA DE PUBLICACIÓN</p><h2 id="proposal-editor-title">Editar propuesta</h2></div><button ref={closeRef} type="button" className="proposal-editor__close" aria-label="Cerrar editor" onClick={close}>×</button></header>
    <form onSubmit={(event) => void submit(event)} className="proposal-editor__form">
      <label>Título<input value={draft.title} required maxLength={200} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Descripción<textarea value={draft.description} required maxLength={2200} rows={6} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>Hashtags<textarea value={draft.hashtags} maxLength={500} rows={2} onChange={(event) => setDraft({ ...draft, hashtags: event.target.value })} /></label>
      <section className="proposal-editor__media"><div><h3>Imagen o vídeo</h3><p>{selected ? `${selected.media_kind === 'image' ? 'Imagen' : 'Vídeo'} seleccionado: ${selected.title}` : draft.editorial_content_id ? 'El material seleccionado ya no está disponible en la biblioteca.' : 'Puedes elegir un archivo de Gestión de contenidos.'}</p></div><button type="button" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}>{libraryOpen ? 'Cerrar biblioteca' : 'Elegir de la biblioteca'}</button>
        {draft.editorial_content_id && <button type="button" onClick={() => setDraft({ ...draft, editorial_content_id: null })}>Quitar selección</button>}
        {libraryOpen && <div className="proposal-editor__library"><label>Buscar en la biblioteca<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título o carpeta" /></label>{loading ? <p role="status">Cargando biblioteca…</p> : filtered.length ? <ul>{filtered.map((item) => <li key={item.id}><button type="button" aria-pressed={draft.editorial_content_id === item.id} onClick={() => { setDraft({ ...draft, editorial_content_id: item.id }); setLibraryOpen(false) }}><span>{item.media_kind === 'image' ? '▧ Imagen' : '▷ Vídeo'}</span><strong>{item.title}</strong><small>{item.drive_folder_path || 'Biblioteca'}</small></button></li>)}</ul> : <p>No hay archivos con enlace para esta búsqueda. Vincula una carpeta o añade contenido en Gestión de contenidos.</p>}</div>}
      </section>
      <label>Fecha y hora prevista <span>(opcional al guardar)</span><input type="datetime-local" value={draft.scheduled_for} onChange={(event) => setDraft({ ...draft, scheduled_for: event.target.value })} /></label>
      <p className="proposal-editor__note">Guardar conserva la propuesta en edición. Autorizar registra tu decisión en RADAR; todavía no publica ni programa en Instagram.</p>
      {error && <p role="alert" className="proposal-editor__error">{error}</p>}
      {saveError && <p role="alert" className="proposal-editor__error">{saveError}</p>}
      <div className="proposal-editor__actions"><button type="button" onClick={close} disabled={busy}>Cancelar</button><button type="submit" value="save" disabled={busy}>Guardar edición</button><button type="submit" value="authorize" className="proposal-editor__primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y autorizar'}</button></div>
    </form>
  </section></div>
}

import { useEffect, useState } from 'react'
import type { RadarAccount } from '../../context/AccountContext'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import ProposalEditor, { type LibraryItem, type ProposalDraft } from './ProposalEditor'
import './daily-proposals.css'

type Proposal = { id: string; title: string; description: string; hashtags: string; image_path: string | null; visual_status: 'pending' | 'ready' | 'unavailable'; created_at: string; scheduled_for: string | null; editorial_content_id: string | null; editing_in_progress: boolean; imageUrl?: string; selectedMedia?: LibraryItem | null }
type Batch = { status: 'generating' | 'ready' | 'error'; message: string | null; generation_date: string }
type Props = { account: RadarAccount }
const isFuture = (value: string) => !Number.isNaN(new Date(value).getTime()) && new Date(value).getTime() > Date.now()
const currentTime = () => new Date().toISOString()

export default function DailyProposals({ account }: Props) {
  const [items, setItems] = useState<Proposal[]>([])
  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [scheduledFor, setScheduledFor] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [view, setView] = useState<'pending' | 'approved'>('pending')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (account.source !== 'instagram') { setItems([]); setBatch(null); setLoading(false); return }
      setLoading(true); setError(''); setItems([]); setBatch(null); setEditing(null); setScheduling(null)
      try {
        await ensureDemoSession()
        const [proposals, batches] = await Promise.all([
          supabase.from('ai_content_proposals').select('id,title,description,hashtags,image_path,visual_status,created_at,scheduled_for,editorial_content_id,editing_in_progress').eq('account_id', account.id).eq('status', view).order('created_at', { ascending: false }).order('position', { ascending: true }),
          supabase.from('ai_content_batches').select('status,message,generation_date').eq('account_id', account.id).order('generation_date', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (proposals.error) throw proposals.error
        if (batches.error) throw batches.error
        const withUrls = await Promise.all(((proposals.data ?? []) as Proposal[]).map(async (item) => {
          if (!item.image_path) return item
          const { data } = await supabase.storage.from('ai-proposal-visuals').createSignedUrl(item.image_path, 3600)
          return { ...item, imageUrl: data?.signedUrl }
        }))
        const selectedIds = [...new Set(withUrls.map((item) => item.editorial_content_id).filter((id): id is string => Boolean(id)))]
        let selectedMedia: LibraryItem[] = []
        if (selectedIds.length) {
          const result = await supabase.from('editorial_content').select('id,title,drive_url,drive_folder_path,media_kind').eq('account_id', account.id).in('id', selectedIds)
          if (!result.error) selectedMedia = (result.data ?? []) as LibraryItem[]
        }
        if (active) { setItems(withUrls.map((item) => ({ ...item, selectedMedia: selectedMedia.find((media) => media.id === item.editorial_content_id) ?? null }))); setBatch(batches.data as Batch | null) }
      } catch { if (active) setError('No se pueden cargar las propuestas. Comprueba que la cola y la función diaria estén instaladas en Supabase.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [account.id, account.source, view])

  const update = async (id: string, changes: Record<string, string | boolean | null>, selectedMedia?: LibraryItem | null) => {
    setBusy(id); setError(''); setNotice('')
    try {
      const { data, error: updateError } = await supabase.from('ai_content_proposals').update({ ...changes, updated_at: currentTime() }).eq('id', id).eq('account_id', account.id).eq('status', 'pending').select('id').maybeSingle()
      if (updateError || !data) throw updateError ?? new Error('No se encontró la propuesta pendiente.')
      if (changes.status) { setItems((current) => current.filter((item) => item.id !== id)); setScheduling(null); setEditing(null); setNotice(changes.status === 'approved' ? 'Autorizada y guardada en RADAR. Aún no se enviará a Instagram: la publicación automática no está activada.' : 'Propuesta descartada.') }
      else { setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes, ...(selectedMedia !== undefined ? { selectedMedia } : {}) } as Proposal : item)); setEditing(null); setNotice('Cambios guardados. La propuesta sigue en edición y no está autorizada.') }
    } catch { setError('No se pudo guardar el cambio. Comprueba la conexión e inténtalo de nuevo.') }
    finally { setBusy(null) }
  }

  const saveDraft = async (draft: ProposalDraft, authorize: boolean, selectedMedia: LibraryItem | null) => {
    if (!editing) return
    await update(editing, { ...draft, editing_in_progress: !authorize, ...(authorize ? { status: 'approved', approved_at: currentTime() } : {}) }, selectedMedia)
  }
  const editedItem = items.find((item) => item.id === editing)

  return <section className="daily-proposals" aria-labelledby="daily-proposals-title">
    <div className="daily-proposals__header"><h2 id="daily-proposals-title">Estudio IA: Propuestas pendientes de autorización</h2></div>
    <p className="daily-proposals__disclaimer">Las propuestas se generan con los datos disponibles; no se verifican tendencias externas. Autorizar guarda la decisión en RADAR, pero todavía no publica ni programa en Instagram.</p>
    <div className="daily-proposals__tabs" aria-label="Estado de las propuestas"><button type="button" aria-pressed={view === 'pending'} onClick={() => { setView('pending'); setShowAll(false) }}>Pendientes</button><button type="button" aria-pressed={view === 'approved'} onClick={() => { setView('approved'); setShowAll(false) }}>Autorizadas</button></div>
    {notice && <p className="daily-proposals__success" role="status">{notice}</p>}{error && <p className="daily-proposals__error" role="alert">{error}</p>}
    {batch?.status === 'error' && <p className="daily-proposals__error" role="alert">La última generación no se completó: {batch.message || 'Comprueba Gemini y vuelve a intentarlo más adelante.'}</p>}
    {loading ? <p className="daily-proposals__empty" role="status">Cargando propuestas…</p> : account.source !== 'instagram' ? <p className="daily-proposals__empty">Selecciona la cuenta conectada de @retorika_academy para ver sus propuestas.</p> : !items.length ? <div className="daily-proposals__empty"><strong>{view === 'approved' ? 'Todavía no has autorizado propuestas' : 'Tu espacio para nuevas ideas ✦'}</strong><p>{view === 'approved' ? 'Aquí podrás consultar las propuestas autorizadas en RADAR.' : batch?.status === 'generating' ? 'Estamos preparando las propuestas de hoy.' : 'Cuando el proceso diario esté configurado y existan publicaciones sincronizadas, las propuestas aparecerán aquí para tu revisión.'}</p></div> : <><div id="daily-proposals-list" className="daily-proposals__grid">{(showAll ? items : items.slice(0, 3)).map((item) => <article className="daily-proposal" key={item.id}>
      <div className="daily-proposal__visual">{item.editorial_content_id ? <div><span aria-hidden="true">▱</span><strong>{item.selectedMedia?.title || 'Material de la biblioteca seleccionado'}</strong><small>Archivo vinculado a esta propuesta</small></div> : item.imageUrl ? <img src={item.imageUrl} alt={`Imagen propuesta para ${item.title}`} /> : <div><span aria-hidden="true">✳</span><strong>{item.visual_status === 'pending' ? 'Preparando imagen' : 'Imagen no disponible'}</strong><small>{item.visual_status === 'unavailable' ? 'Revisa la cuota de imágenes de Gemini.' : 'La vista previa aparecerá cuando se complete.'}</small></div>}<span className="daily-proposal__badge">{view === 'approved' ? 'AUTORIZADA EN RADAR' : item.editing_in_progress ? 'EDICIÓN EN PROCESO' : 'PENDIENTE DE REVISIÓN'}</span></div>
      <div className="daily-proposal__body"><p className="daily-proposal__date">IDEA GENERADA · {new Date(item.created_at).toLocaleDateString('es-ES')}</p><h3>{item.title}</h3><p className="daily-proposal__description">{item.description}</p><p className="daily-proposal__hashtags">{item.hashtags}</p>{item.editorial_content_id && <p className="daily-proposal__material">Archivo de la biblioteca seleccionado</p>}{item.scheduled_for && view === 'pending' && <p className="daily-proposal__material">Fecha prevista: {new Date(item.scheduled_for).toLocaleString('es-ES')}</p>}
        {scheduling === item.id && <div className="daily-proposal__schedule"><label>Fecha y hora de referencia<input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required /></label><p>La autorización se registrará en RADAR. No se enviará a Instagram automáticamente.</p><button type="button" disabled={!scheduledFor || busy === item.id} onClick={() => { if (!isFuture(scheduledFor)) { setError('Selecciona una fecha futura.'); return }; void update(item.id, { status: 'approved', scheduled_for: new Date(scheduledFor).toISOString(), approved_at: currentTime(), editing_in_progress: false }) }}>Confirmar autorización</button><button type="button" onClick={() => setScheduling(null)}>Cancelar</button></div>}
        {view === 'approved' ? <p className="daily-proposal__date">FECHA DE REFERENCIA · {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString('es-ES') : 'SIN FECHA'} · NO ENVIADA A INSTAGRAM</p> : <div className="daily-proposal__actions"><button type="button" onClick={() => { setError(''); setEditing(item.id); setScheduling(null) }}>Editar</button><button type="button" className="daily-proposal__primary" onClick={() => { setScheduling(item.id); setScheduledFor(item.scheduled_for ? new Date(new Date(item.scheduled_for).getTime() - new Date(item.scheduled_for).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '') }}>Programar / Autorizar</button><button type="button" disabled={busy === item.id} onClick={() => { if (window.confirm('¿Descartar esta propuesta?')) void update(item.id, { status: 'discarded' }) }}>Descartar</button></div>}</div>
    </article>)}</div>{items.length > 3 && <div className="daily-proposals__more"><button type="button" aria-expanded={showAll} aria-controls="daily-proposals-list" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Minimizar vista' : 'Ver más propuestas'}</button></div>}</>}
    {editedItem && <ProposalEditor key={editedItem.id} accountId={account.id} initial={{ title: editedItem.title, description: editedItem.description, hashtags: editedItem.hashtags, scheduled_for: editedItem.scheduled_for, editorial_content_id: editedItem.editorial_content_id }} busy={busy === editedItem.id} saveError={error} onClose={() => { setEditing(null); setError('') }} onSave={saveDraft} />}
  </section>
}

import { useEffect, useState } from 'react'
import type { RadarAccount } from '../../context/AccountContext'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import './daily-proposals.css'

type Proposal = { id: string; title: string; description: string; hashtags: string; image_path: string | null; visual_status: 'pending' | 'ready' | 'unavailable'; created_at: string; scheduled_for: string | null; imageUrl?: string }
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
  const [draft, setDraft] = useState({ title: '', description: '', hashtags: '' })
  const [scheduledFor, setScheduledFor] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [view, setView] = useState<'pending' | 'approved'>('pending')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (account.source !== 'instagram') { setItems([]); setBatch(null); setLoading(false); return }
      setLoading(true); setError(''); setItems([]); setBatch(null); setEditing(null); setScheduling(null)
      try {
        await ensureDemoSession()
        const [proposals, batches] = await Promise.all([
          supabase.from('ai_content_proposals').select('id,title,description,hashtags,image_path,visual_status,created_at,scheduled_for').eq('account_id', account.id).eq('status', view).order('created_at', { ascending: false }).order('position', { ascending: true }),
          supabase.from('ai_content_batches').select('status,message,generation_date').eq('account_id', account.id).order('generation_date', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (proposals.error) throw proposals.error
        if (batches.error) throw batches.error
        const withUrls = await Promise.all(((proposals.data ?? []) as Proposal[]).map(async (item) => {
          if (!item.image_path) return item
          const { data } = await supabase.storage.from('ai-proposal-visuals').createSignedUrl(item.image_path, 3600)
          return { ...item, imageUrl: data?.signedUrl }
        }))
        if (active) { setItems(withUrls); setBatch(batches.data as Batch | null) }
      } catch { if (active) setError('No se pueden cargar las propuestas. Comprueba que la cola y la función diaria estén instaladas en Supabase.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [account.id, account.source, view])

  const update = async (id: string, changes: Record<string, string | null>) => {
    setBusy(id); setError(''); setNotice('')
    try {
      const { data, error: updateError } = await supabase.from('ai_content_proposals').update({ ...changes, updated_at: currentTime() }).eq('id', id).eq('account_id', account.id).eq('status', 'pending').select('id').maybeSingle()
      if (updateError || !data) throw updateError ?? new Error('No se encontró la propuesta pendiente.')
      if (changes.status) { setItems((current) => current.filter((item) => item.id !== id)); setScheduling(null); setNotice(changes.status === 'approved' ? 'Autorizada y guardada en RADAR. Aún no se enviará a Instagram: la publicación automática no está activada.' : 'Propuesta descartada.') }
      else { setItems((current) => current.map((item) => item.id === id ? { ...item, ...draft } : item)); setEditing(null); setNotice('Cambios guardados.') }
    } catch { setError('No se pudo guardar el cambio. Comprueba la conexión e inténtalo de nuevo.') }
    finally { setBusy(null) }
  }

  return <section className="daily-proposals" aria-labelledby="daily-proposals-title">
    <div className="daily-proposals__header"><div><p>ESTUDIO IA · TU REVISIÓN ES LA ÚLTIMA PALABRA</p><h2 id="daily-proposals-title">Propuestas pendientes de autorización</h2><span>Hasta tres ideas diarias inspiradas en las publicaciones recientes y destacadas de Retorika.</span></div><span className="daily-proposals__count">✦ {items.length} {view === 'pending' ? 'pendientes' : 'autorizadas'}</span></div>
    <p className="daily-proposals__disclaimer">Las propuestas se generan con los datos disponibles; no se verifican tendencias externas. Autorizar guarda la decisión en RADAR, pero todavía no publica ni programa en Instagram.</p>
    <div className="daily-proposals__tabs" aria-label="Estado de las propuestas"><button type="button" aria-pressed={view === 'pending'} onClick={() => setView('pending')}>Pendientes</button><button type="button" aria-pressed={view === 'approved'} onClick={() => setView('approved')}>Autorizadas</button></div>
    {notice && <p className="daily-proposals__success" role="status">{notice}</p>}{error && <p className="daily-proposals__error" role="alert">{error}</p>}
    {batch?.status === 'error' && <p className="daily-proposals__error" role="alert">La última generación no se completó: {batch.message || 'Comprueba Gemini y vuelve a intentarlo más adelante.'}</p>}
    {loading ? <p className="daily-proposals__empty" role="status">Cargando propuestas…</p> : account.source !== 'instagram' ? <p className="daily-proposals__empty">Selecciona la cuenta conectada de @retorika_academy para ver sus propuestas.</p> : !items.length ? <div className="daily-proposals__empty"><strong>{view === 'approved' ? 'Todavía no has autorizado propuestas' : 'Tu espacio para nuevas ideas ✦'}</strong><p>{view === 'approved' ? 'Aquí podrás consultar las propuestas autorizadas en RADAR.' : batch?.status === 'generating' ? 'Estamos preparando las propuestas de hoy.' : 'Cuando el proceso diario esté configurado y existan publicaciones sincronizadas, las propuestas aparecerán aquí para tu revisión.'}</p></div> : <div className="daily-proposals__grid">{items.map((item) => <article className="daily-proposal" key={item.id}>
      <div className="daily-proposal__visual">{item.imageUrl ? <img src={item.imageUrl} alt={`Imagen propuesta para ${item.title}`} /> : <div><span aria-hidden="true">✳</span><strong>{item.visual_status === 'pending' ? 'Preparando imagen' : 'Imagen no disponible'}</strong><small>{item.visual_status === 'unavailable' ? 'Revisa la cuota de imágenes de Gemini.' : 'La vista previa aparecerá cuando se complete.'}</small></div>}<span className="daily-proposal__badge">{view === 'approved' ? 'AUTORIZADA EN RADAR' : 'PENDIENTE DE REVISIÓN'}</span></div>
      {editing === item.id ? <form className="daily-proposal__body" onSubmit={(event) => { event.preventDefault(); void update(item.id, draft) }}><label>Título<input required maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Descripción<textarea required maxLength={2200} rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Hashtags<textarea maxLength={500} rows={2} value={draft.hashtags} onChange={(event) => setDraft({ ...draft, hashtags: event.target.value })} /></label><div className="daily-proposal__actions"><button type="submit" disabled={busy === item.id}>Guardar</button><button type="button" onClick={() => setEditing(null)}>Cancelar</button></div></form> : <div className="daily-proposal__body"><p className="daily-proposal__date">IDEA GENERADA · {new Date(item.created_at).toLocaleDateString('es-ES')}</p><h3>{item.title}</h3><p className="daily-proposal__description">{item.description}</p><p className="daily-proposal__hashtags">{item.hashtags}</p>
        {scheduling === item.id && <div className="daily-proposal__schedule"><label>Fecha y hora de referencia<input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required /></label><p>La autorización se registrará en RADAR. No se enviará a Instagram automáticamente.</p><button type="button" disabled={!scheduledFor || busy === item.id} onClick={() => { if (!isFuture(scheduledFor)) { setError('Selecciona una fecha futura.'); return }; void update(item.id, { status: 'approved', scheduled_for: new Date(scheduledFor).toISOString(), approved_at: currentTime() }) }}>Confirmar autorización</button><button type="button" onClick={() => setScheduling(null)}>Cancelar</button></div>}
        {view === 'approved' ? <p className="daily-proposal__date">FECHA DE REFERENCIA · {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString('es-ES') : 'SIN FECHA'} · NO ENVIADA A INSTAGRAM</p> : <div className="daily-proposal__actions"><button type="button" onClick={() => { setEditing(item.id); setScheduling(null); setDraft({ title: item.title, description: item.description, hashtags: item.hashtags }) }}>Editar</button><button type="button" className="daily-proposal__primary" onClick={() => { setScheduling(item.id); setScheduledFor('') }}>Programar / Autorizar</button><button type="button" disabled={busy === item.id} onClick={() => { if (window.confirm('¿Descartar esta propuesta?')) void update(item.id, { status: 'discarded' }) }}>Descartar</button></div>}</div>}
    </article>)}</div>}
  </section>
}

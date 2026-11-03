import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { loadContentPosts, saveContentPosts } from '../../lib/contentStudioStorage'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { ContentObjective, ContentPost, ContentStatus } from '../../types/contentStudio'
import './content-studio.css'

type ContentStudioProps = { accountId: string, username: string }

const objectives: Array<{ value: ContentObjective, label: string, icon: string }> = [
  { value: 'sell', label: 'Vender', icon: '↗' }, { value: 'inform', label: 'Informar', icon: 'i' },
  { value: 'students', label: 'Captar alumnos', icon: '◎' }, { value: 'engagement', label: 'Generar interacción', icon: '✦' },
  { value: 'event', label: 'Promocionar un evento', icon: '◷' }, { value: 'other', label: 'Otro objetivo', icon: '+' },
]

const statusCopy: Record<ContentStatus, { label: string, tone: string }> = {
  draft: { label: 'Borrador', tone: 'slate' }, review: { label: 'Pendiente de revisión', tone: 'orange' },
  scheduled: { label: 'Programada', tone: 'blue' }, pending_authorization: { label: 'Pendiente de autorización', tone: 'pink' },
  published: { label: 'Publicada', tone: 'green' }, error: { label: 'Error de publicación', tone: 'red' },
}

function nextWednesdayAt1830() {
  const date = new Date()
  const offset = (3 - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + offset)
  date.setHours(18, 30, 0, 0)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function newPost(): ContentPost {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), objective: 'engagement', customObjective: '', idea: '', mediaType: 'image', visualName: '', visualPrompt: '',
    description: '', hashtags: '', cta: '', status: 'draft', scheduledFor: nextWednesdayAt1830(), previousDescriptions: [], createdAt: now, updatedAt: now,
  }
}

function tagsCount(value: string) { return value.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0 }

function formatDate(value: string) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

function ContentStudio({ accountId, username }: ContentStudioProps) {
  const [posts, setPosts] = useState<ContentPost[]>(() => loadContentPosts(accountId))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ContentStatus>('all')
  const [message, setMessage] = useState('')
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false)

  useEffect(() => { setPosts(loadContentPosts(accountId)); setActiveId(null) }, [accountId])
  useEffect(() => { saveContentPosts(accountId, posts) }, [accountId, posts])
  useEffect(() => {
    const checkDuePosts = () => setPosts((current) => current.map((post) => post.status === 'scheduled' && !post.authorizedAt && post.scheduledFor && new Date(post.scheduledFor) <= new Date()
      ? { ...post, status: 'pending_authorization', updatedAt: new Date().toISOString() } : post))
    checkDuePosts()
    const interval = window.setInterval(checkDuePosts, 30000)
    return () => window.clearInterval(interval)
  }, [])

  const active = posts.find((post) => post.id === activeId) ?? null
  const visiblePosts = useMemo(() => posts.filter((post) => filter === 'all' || post.status === filter).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [filter, posts])

  const updateActive = (patch: Partial<ContentPost>) => {
    if (!active) return
    setPosts((current) => current.map((post) => post.id === active.id ? { ...post, ...patch, updatedAt: new Date().toISOString() } : post))
  }
  const createPost = () => { const post = newPost(); setPosts((current) => [post, ...current]); setActiveId(post.id); setMessage('Nuevo borrador creado y guardado automáticamente.') }
  const setStatus = (status: ContentStatus, success: string) => { if (!active) return; updateActive({ status }); setMessage(success) }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !active) return
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    updateActive({ mediaType: type, visualName: file.name, previewUrl: URL.createObjectURL(file) })
    setMessage('Archivo preparado en esta sesión. El texto y la programación se guardan automáticamente como borrador.')
  }

  const generateText = async () => {
    if (!active) return
    setIsGeneratingText(true); setMessage('')
    try {
      await ensureDemoSession()
      const { data, error } = await supabase.functions.invoke('instagram-content-assistant', { body: {
        objective: active.objective, customObjective: active.customObjective, idea: active.idea, username, previousDescription: active.description,
      } })
      if (error || !data?.description) throw error ?? new Error('Sin propuesta de texto.')
      updateActive({ description: String(data.description).slice(0, 2200), hashtags: String(data.hashtags ?? '').split(/\s+/).slice(0, 30).join(' '), cta: String(data.cta ?? '').slice(0, 180), previousDescriptions: active.description ? [...active.previousDescriptions, active.description].slice(-5) : active.previousDescriptions })
      setMessage('Propuesta de IA preparada. Puedes editarla antes de cualquier acción.')
    } catch {
      setMessage('No se pudo generar el texto con IA. Comprueba que la función de contenido y GEMINI_API_KEY estén configuradas; puedes seguir editando manualmente.')
    } finally { setIsGeneratingText(false) }
  }

  const generateVisual = async () => {
    if (!active || !active.visualPrompt.trim()) { setMessage('Describe primero la imagen o vídeo que quieres generar.'); return }
    setIsGeneratingVisual(true); setMessage('')
    try {
      await ensureDemoSession()
      const { data, error } = await supabase.functions.invoke('instagram-content-visual', { body: { prompt: active.visualPrompt, mediaType: active.mediaType } })
      if (error || !data?.previewUrl) throw error ?? new Error('Sin visual generado.')
      updateActive({ visualName: 'Visual generado con IA', previewUrl: String(data.previewUrl) })
      setMessage('Visual generado. Revísalo y sustitúyelo si no representa tu marca.')
    } catch {
      setMessage('No se pudo generar el visual. La generación de vídeo requiere un proveedor compatible; puedes importar tu propio archivo.')
    } finally { setIsGeneratingVisual(false) }
  }

  const publishNow = () => {
    if (!active) return
    if (!window.confirm('¿Confirmas marcar esta publicación como publicada? RADAR no enviará nada a Instagram hasta activar la función de publicación de Meta.')) return
    updateActive({ status: 'published', publishedAt: new Date().toISOString() })
    setMessage('Marcada como publicada en el flujo local. No se ha enviado contenido a Instagram.')
  }

  return <section className="content-studio" aria-labelledby="content-studio-title">
    <header className="content-studio__header"><div><p>ESTUDIO DE CONTENIDO</p><h2 id="content-studio-title">Crea y controla tus próximas publicaciones</h2><span>Todo se guarda como borrador. La publicación real requiere tu autorización final.</span></div><button type="button" className="content-studio__create" onClick={createPost}>+ Crear publicación</button></header>
    <div className="content-studio__body">
      <aside className="content-studio__queue" aria-label="Cola de publicaciones">
        <div className="content-studio__filters"><button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Todas</button>{(Object.keys(statusCopy) as ContentStatus[]).map((status) => <button type="button" className={filter === status ? 'is-active' : ''} onClick={() => setFilter(status)} key={status}>{statusCopy[status].label}</button>)}</div>
        <div className="content-studio__post-list">{visiblePosts.length ? visiblePosts.map((post) => <button type="button" key={post.id} className={post.id === activeId ? 'content-studio__post is-selected' : 'content-studio__post'} onClick={() => setActiveId(post.id)}><span className={`content-studio__status content-studio__status--${statusCopy[post.status].tone}`}>{statusCopy[post.status].label}</span><strong>{post.idea || 'Nueva publicación'}</strong><small>{formatDate(post.scheduledFor || post.updatedAt)}</small>{post.authorizedAt && <em>Autorizada</em>}{post.status === 'published' && <em>Modo local: no enviada</em>}</button>) : <p className="content-studio__empty">Aún no hay publicaciones en la cola. Crea una para empezar.</p>}</div>
      </aside>
      {active ? <div className="content-studio__editor">
        <div className="content-studio__step"><span>1</span><div><h3>Objetivo y enfoque</h3><p>Define qué debe conseguir esta publicación.</p></div></div>
        <div className="content-studio__objectives">{objectives.map((item) => <button type="button" className={active.objective === item.value ? 'is-selected' : ''} key={item.value} onClick={() => updateActive({ objective: item.value })}><i>{item.icon}</i>{item.label}</button>)}</div>
        {active.objective === 'other' && <label className="content-studio__field">Objetivo personalizado<input value={active.customObjective} onChange={(event) => updateActive({ customObjective: event.target.value })} placeholder="¿Qué quieres lograr?" /></label>}
        <label className="content-studio__field">Idea principal<textarea value={active.idea} onChange={(event) => updateActive({ idea: event.target.value })} placeholder="Resume el tema, el público y el mensaje que quieres transmitir." rows={3} /></label>

        <div className="content-studio__step"><span>2</span><div><h3>Visual</h3><p>Importa tu archivo o crea un visual con IA.</p></div></div>
        <div className="content-studio__media-actions"><label className="content-studio__file">Importar imagen o vídeo<input type="file" accept="image/*,video/*" onChange={selectFile} /></label><select value={active.mediaType} onChange={(event) => updateActive({ mediaType: event.target.value as ContentPost['mediaType'] })}><option value="image">Imagen</option><option value="video">Vídeo</option></select></div>
        <div className="content-studio__generate-visual"><input value={active.visualPrompt} onChange={(event) => updateActive({ visualPrompt: event.target.value })} placeholder="Describe el visual que quieres generar con IA" /><button type="button" onClick={() => void generateVisual()} disabled={isGeneratingVisual}>{isGeneratingVisual ? 'Generando…' : 'Generar visual con IA'}</button></div>

        <div className="content-studio__step"><span>3</span><div><h3>Texto y hashtags</h3><p>La IA propone; tú decides la versión final.</p></div><button type="button" className="content-studio__ai-button" onClick={() => void generateText()} disabled={isGeneratingText}>{isGeneratingText ? 'Generando…' : '✦ Generar con IA'}</button></div>
        <label className="content-studio__field">Descripción<textarea value={active.description} maxLength={2200} onChange={(event) => updateActive({ description: event.target.value })} placeholder="Escribe o genera una descripción para Instagram." rows={6} /><small>{active.description.length}/2200 caracteres</small></label>
        <label className="content-studio__field">Hashtags<input value={active.hashtags} onChange={(event) => updateActive({ hashtags: event.target.value })} placeholder="#retorika #aprendizaje" /><small>{tagsCount(active.hashtags)}/30 hashtags</small></label>
        <label className="content-studio__field">Llamada a la acción<input value={active.cta} onChange={(event) => updateActive({ cta: event.target.value })} placeholder="Por ejemplo: Guarda este post y compártelo." /></label>
        {active.previousDescriptions.length > 0 && <details className="content-studio__versions"><summary>Versiones anteriores ({active.previousDescriptions.length})</summary>{active.previousDescriptions.map((version, index) => <button type="button" key={`${version}-${index}`} onClick={() => updateActive({ description: version })}>Restaurar versión {index + 1}</button>)}</details>}

        <div className="content-studio__step"><span>4</span><div><h3>Programación inteligente</h3><p>Tu audiencia suele estar más activa los miércoles entre las 18:00 y las 20:00.</p></div></div>
        <div className="content-studio__schedule"><label>Fecha y hora<input type="datetime-local" value={active.scheduledFor} onChange={(event) => updateActive({ scheduledFor: event.target.value })} /></label><button type="button" onClick={() => updateActive({ scheduledFor: nextWednesdayAt1830() })}>Usar recomendación</button></div>
        <div className="content-studio__actions"><button type="button" onClick={() => setStatus('draft', 'Borrador guardado correctamente.')}>Guardar borrador</button><button type="button" onClick={() => setStatus('review', 'Publicación enviada a revisión.')}>Enviar a revisión</button><button type="button" onClick={() => setStatus('scheduled', 'Publicación programada. Deberás autorizarla antes de la hora prevista.')}>Programar</button>{(active.status === 'scheduled' || active.status === 'pending_authorization') && <button type="button" className="is-authorize" onClick={() => { updateActive({ status: 'scheduled', authorizedAt: new Date().toISOString() }); setMessage('Publicación autorizada. Solo podrá enviarse cuando esté activa la función de publicación de Meta.') }}>Autorizar publicación</button>}<button type="button" className="is-publish" onClick={publishNow}>Publicar inmediatamente</button></div>
      </div> : <div className="content-studio__welcome"><span>✦</span><h3>Tu próximo contenido empieza aquí</h3><p>Crea una publicación, prepara el visual y revisa cada detalle antes de programarla.</p><button type="button" onClick={createPost}>Crear mi primera publicación</button></div>}
      {active && <aside className="content-studio__preview" aria-label="Vista previa de Instagram"><p>VISTA PREVIA</p><div className="instagram-post"><header><b>◎</b><strong>{username}</strong><span>•••</span></header><div className={`instagram-post__visual instagram-post__visual--${active.mediaType}`}>{active.previewUrl ? active.mediaType === 'video' ? <video src={active.previewUrl} controls muted /> : <img src={active.previewUrl} alt="Previsualización seleccionada" /> : <><i>{active.mediaType === 'video' ? '▶' : '✦'}</i><span>{active.visualPrompt || 'Añade un visual para previsualizarlo aquí'}</span></>}</div><div className="instagram-post__content"><b>{username}</b> <span>{active.description || 'Tu descripción aparecerá aquí.'}</span><em>{active.hashtags}</em>{active.cta && <strong>{active.cta}</strong>}</div></div></aside>}
    </div>{message && <p className="content-studio__message" role="status">{message}</p>}
  </section>
}

export default ContentStudio

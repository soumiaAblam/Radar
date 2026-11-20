import { useState, type FormEvent } from 'react'
import { sourceLabel, todayKey, type RadarAction, type RadarPriority, type useRadarWorkspace } from '../../lib/radarWorkspace'

type Workspace = ReturnType<typeof useRadarWorkspace>
type Props = { workspace: Workspace; disabled: boolean; filter: string; onFilterChange: (value: string) => void }
type Draft = { title: string; description: string; category: string; priority: RadarPriority; due_on: string; recurrence: 'none' | 'daily' | 'weekly'; metric: string }
const categories: Record<string, string> = { analizar: 'Analizar', crear: 'Crear contenido', publicar: 'Publicar', experimentar: 'Experimentar', optimizar: 'Optimizar', revisar: 'Revisar resultados' }
const blank = (): Draft => ({ title: '', description: '', category: 'analizar', priority: 'media', due_on: todayKey(), recurrence: 'none', metric: '' })
const nextDate = (date: string) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function RadarActions({ workspace, disabled, filter, onFilterChange }: Props) {
  const [form, setForm] = useState<Draft | null>(null)
  const [editing, setEditing] = useState<RadarAction | null>(null)
  const [formError, setFormError] = useState('')
  const today = todayKey()
  const visible = workspace.actions.filter((a) => a.status !== 'discarded' && (filter === 'today' ? a.due_on <= today : filter === 'pending' ? a.status === 'pending' : filter === 'done' ? a.status === 'done' : true))
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!form || !form.title.trim()) { setFormError('Escribe un título para la acción.'); return }
    const payload = { ...form, title: form.title.trim(), description: form.description.trim(), metric: form.metric.trim(), series_id: form.recurrence === 'none' ? null : editing?.series_id ?? crypto.randomUUID() }
    const ok = editing ? await workspace.updateAction(editing.id, payload) : await workspace.addAction({ ...payload, source: 'user' })
    if (ok) { setForm(null); setEditing(null); setFormError('') }
  }
  const edit = (item: RadarAction) => { setEditing(item); setForm({ title: item.title, description: item.description, category: item.category, priority: item.priority, due_on: item.due_on, recurrence: item.recurrence, metric: item.metric }); setFormError('') }
  return <section className="rw-panel rw-actions" id="radar-plan" aria-labelledby="radar-actions-title"><div className="rw-heading"><div><p className="rw-kicker rw-pink">PASO A PASO</p><h2 id="radar-actions-title">Tu plan de hoy</h2></div><button className="rw-primary" type="button" disabled={disabled || workspace.busy} onClick={() => { setForm(blank()); setEditing(null) }}>＋ Añadir acción</button></div>
    {form && <form className="rw-form" onSubmit={(event) => void save(event)}><div className="rw-form-title"><h3>{editing ? 'Editar acción' : 'Nueva acción'}</h3><button type="button" aria-label="Cerrar formulario" onClick={() => setForm(null)}>×</button></div><div className="rw-form-grid">
      <label className="rw-wide">Título<input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="¿Qué quieres hacer?" /></label>
      <label className="rw-wide">Detalles<textarea rows={2} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label>Categoría<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(categories).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Prioridad<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as RadarPriority })}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
      <label>Fecha<input required type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} /></label>
      <label>Repetir<select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as Draft['recurrence'] })}><option value="none">No repetir</option><option value="daily">Cada día</option><option value="weekly">Cada semana</option></select></label>
      <label className="rw-wide">Métrica relacionada <span>(opcional)</span><input maxLength={120} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="Por ejemplo: guardados" /></label></div><p className="rw-hint">Las tareas recurrentes crean la siguiente al completar la actual. Si reabres una tarea, la próxima ya creada se conserva.</p>{formError && <p className="rw-error" role="alert">{formError}</p>}<button className="rw-primary" type="submit" disabled={workspace.busy}>Guardar acción</button></form>}
    <div className="rw-filter"><label htmlFor="radar-action-filter">Mostrar</label><select id="radar-action-filter" value={filter} onChange={(e) => onFilterChange(e.target.value)}><option value="today">Hasta hoy</option><option value="pending">Pendientes</option><option value="done">Completadas</option><option value="all">Todas</option></select></div>
    {!visible.length ? <div className="rw-empty"><span aria-hidden="true">✧</span><div><strong>Un buen día empieza con un paso.</strong><p>{disabled ? 'Conecta y configura la cuenta para guardar tu plan.' : 'Añade una acción o convierte una oportunidad en tu próximo paso.'}</p></div></div> : <ul className="rw-action-list">{visible.map((item) => <li id={`radar-action-${item.id}`} key={item.id} className={item.status === 'done' ? 'is-done' : ''}><button type="button" className="rw-check" disabled={workspace.busy} aria-label={`${item.status === 'done' ? 'Reabrir' : 'Completar'} ${item.title}`} onClick={() => void workspace.updateAction(item.id, { status: item.status === 'done' ? 'pending' : 'done', completed_at: item.status === 'done' ? null : new Date().toISOString() })}>{item.status === 'done' ? '✓' : ''}</button><div className="rw-action-main"><strong>{item.title}</strong><p>{categories[item.category] || item.category} · {item.due_on} · {sourceLabel[item.source]}</p><details><summary>Ver detalles</summary><p>{item.description || 'Sin detalles adicionales.'}</p>{item.evidence && <p>Evidencia: {item.evidence}</p>}{item.metric && <p>Métrica: {item.metric}</p>}{item.recurrence !== 'none' && <p>Repetición: {item.recurrence === 'daily' ? 'diaria' : 'semanal'}</p>}</details></div><div className="rw-action-side"><span className={`rw-priority rw-priority--${item.priority}`}>{item.priority}</span><details><summary aria-label={`Opciones de ${item.title}`}>•••</summary><div><button type="button" onClick={() => edit(item)}>Editar</button>{item.status === 'pending' && <button type="button" onClick={() => void workspace.updateAction(item.id, { due_on: nextDate(item.due_on < today ? today : item.due_on) })}>Posponer un día</button>}<button type="button" onClick={() => { if (window.confirm('¿Eliminar esta acción del plan?')) void workspace.updateAction(item.id, { status: 'discarded' }) }}>Eliminar</button></div></details></div></li>)}</ul>}
  </section>
}

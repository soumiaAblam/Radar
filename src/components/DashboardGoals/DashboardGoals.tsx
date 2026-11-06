import { useState, type FormEvent } from 'react'
import { localDateKey } from '../../lib/dashboardAnalytics'

type Goal = { id: string; title: string; target: number; current: number; unit: string; due: string; priority: 'alta' | 'media' | 'baja'; steps: string[] }
type Draft = { title: string; target: string; current: string; unit: string; due: string; priority: Goal['priority']; steps: string }
const blank: Draft = { title: '', target: '', current: '', unit: '', due: '', priority: 'media', steps: '' }

function loadGoals(key: string): Goal[] {
  try { const data = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(data) ? data : [] } catch { return [] }
}

export default function DashboardGoals({ accountId }: { accountId: string }) {
  const storageKey = `retorika-radar-monthly-goals:${accountId}`
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(storageKey))
  const [draft, setDraft] = useState<Draft>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [today] = useState(() => localDateKey(new Date()))

  const edit = (goal: Goal) => {
    setDraft({ ...goal, target: String(goal.target), current: String(goal.current), steps: goal.steps.join('\n') })
    setEditingId(goal.id)
    setOpen(true)
    setNotice('')
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const target = Number(draft.target), current = Number(draft.current)
    if (!draft.title.trim() || !draft.due || !draft.target || !draft.current || !Number.isFinite(target) || !Number.isFinite(current) || target <= 0 || current < 0) {
      setNotice('Completa el objetivo, la fecha y valores válidos para la meta y el progreso.')
      return
    }
    const goal: Goal = { id: editingId ?? crypto.randomUUID(), title: draft.title.trim(), target, current, unit: draft.unit.trim(), due: draft.due, priority: draft.priority, steps: draft.steps.split('\n').map((step) => step.trim()).filter(Boolean) }
    const next = editingId ? goals.map((item) => item.id === editingId ? goal : item) : [...goals, goal]
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setGoals(next)
      setNotice('Objetivo guardado en este navegador.')
      setOpen(false)
      setDraft(blank)
      setEditingId(null)
    } catch { setNotice('No se ha podido guardar el objetivo en este navegador.') }
  }

  return <section className="summary-goals premium-panel" aria-labelledby="monthly-goals-title">
    <div className="premium-section-head"><div><p className="premium-kicker">TU PRÓXIMO PASO <span>✦</span></p><h2 id="monthly-goals-title">Objetivos del mes<span className="premium-dot">.</span></h2><p>Convierte tus prioridades en pequeños avances.</p></div><button type="button" className="premium-action" onClick={() => { setDraft(blank); setEditingId(null); setOpen(true); setNotice('') }}>＋ Crear objetivo</button></div>
    <p className="summary-goals__storage">Guardados para esta cuenta en este navegador. El progreso se actualiza manualmente.</p>
    {open && <form className="summary-goal-form" onSubmit={save}>
      <div className="summary-goal-form__heading"><h3>{editingId ? 'Editar objetivo' : 'Nuevo objetivo'}</h3><button type="button" onClick={() => { setOpen(false); setEditingId(null); setNotice('') }} aria-label="Cerrar formulario">×</button></div>
      <div className="summary-goal-form__grid">
        <label className="summary-goal-form__wide">Objetivo<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Aumentar las interacciones" maxLength={100} required /></label>
        <label>Meta<input type="number" min="0.01" step="any" value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} required /></label>
        <label>Progreso actual<input type="number" min="0" step="any" value={draft.current} onChange={(event) => setDraft({ ...draft, current: event.target.value })} required /></label>
        <label>Unidad <span>(opcional)</span><input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="Ej. seguidores" maxLength={30} /></label>
        <label>Fecha límite<input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} required /></label>
        <label>Prioridad<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Goal['priority'] })}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
        <label className="summary-goal-form__wide">Pasos importantes <span>(uno por línea, opcional)</span><textarea rows={3} value={draft.steps} onChange={(event) => setDraft({ ...draft, steps: event.target.value })} placeholder={'Define la acción principal\nRevisa el progreso cada semana'} /></label>
      </div>
      <button className="premium-action" type="submit">{editingId ? 'Guardar cambios' : 'Guardar objetivo'}</button>
    </form>}
    {notice && <p className="summary-goals__notice" role="status">{notice}</p>}
    {goals.length === 0 && !open ? <div className="premium-empty premium-empty--goals"><span className="premium-empty__icon">↗</span><div><strong>Un buen plan empieza con una meta.</strong><p>Define tu primer objetivo, la fecha y los pasos que te ayudarán a conseguirlo.</p><button type="button" className="premium-text-button" onClick={() => { setOpen(true); setNotice('') }}>Crear mi primer objetivo <span>→</span></button></div></div>
      : <div className="summary-goals__grid">{goals.map((goal) => {
        const percent = Math.min(100, Math.max(0, Math.round(goal.current / goal.target * 100)))
        const status = goal.current >= goal.target ? 'Conseguido' : goal.due < today ? 'Fecha vencida' : goal.current > 0 ? 'En progreso' : 'Por empezar'
        return <article key={goal.id} className="summary-goal"><div className="summary-goal__top"><span className={`summary-priority summary-priority--${goal.priority}`}>Prioridad {goal.priority}</span><button type="button" onClick={() => edit(goal)} aria-label={`Editar ${goal.title}`}>Editar ↗</button></div><h3>{goal.title}</h3><p className="summary-goal__due">◷ Hasta {new Date(`${goal.due}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {status}</p><div className="summary-goal__progress-label"><strong>{percent}%</strong><span>{goal.current.toLocaleString('es-ES')} / {goal.target.toLocaleString('es-ES')} {goal.unit}</span></div><div className="summary-goal__track" role="progressbar" aria-label={`Progreso de ${goal.title}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>{goal.steps.length > 0 && <ul>{goal.steps.map((step, i) => <li key={`${step}-${i}`}><span>↗</span>{step}</li>)}</ul>}</article>
      })}</div>}
  </section>
}

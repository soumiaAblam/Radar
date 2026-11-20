import { useState } from 'react'
import { todayKey, useRadarClock, type useRadarWorkspace } from '../../lib/radarWorkspace'
import RadarActions from './RadarActions'

type Props = { workspace: ReturnType<typeof useRadarWorkspace>; disabled: boolean }

export default function RadarToday({ workspace, disabled }: Props) {
  const now = useRadarClock()
  const [planFilter, setPlanFilter] = useState('today')
  const today = todayKey(now)
  const pending = workspace.actions.filter((item) => item.status === 'pending' && item.due_on <= today).length
  const completed = workspace.actions.filter((item) => item.status === 'done' && item.completed_at && todayKey(new Date(item.completed_at)) === today).length
  const total = pending + completed
  const progress = total ? Math.round(completed / total * 100) : 0
  const date = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)

  return <div className="rw-today-new">
    <section className="today-progress" aria-labelledby="today-progress-title">
      <div className="today-progress__copy"><p className="today-eyebrow">TU ESPACIO DE HOY <span aria-hidden="true">✦</span></p><h1 id="today-progress-title">Tu avance <em>de hoy.</em></h1><p className="today-progress__date">{date}</p>
        {workspace.loading ? <p className="today-progress__status" role="status">Cargando tu plan…</p> : !workspace.available ? <p className="today-progress__status">Plan no disponible</p> : <p className="today-progress__status">{total ? `${completed} de ${total} ${total === 1 ? 'acción completada' : 'acciones completadas'}` : 'Añade tu primera acción'}</p>}
      </div>
      <div className="today-progress__visual" aria-hidden="true"><div className="today-progress__orbit today-progress__orbit--one" /><div className="today-progress__orbit today-progress__orbit--two" /><span className="today-progress__spark">✦</span>
        {workspace.available && !workspace.loading ? <div className="today-progress__ring" style={{ background: `conic-gradient(#00a56c ${progress}%, #dcefe6 ${progress}%)` }}><div><strong>{progress}%</strong><small>COMPLETADO</small></div></div> : <div className="today-progress__ring today-progress__ring--empty"><div><strong>—</strong><small>PROGRESO</small></div></div>}
      </div>
      {workspace.available && !workspace.loading && <div className="today-sr" role="progressbar" aria-label="Progreso del plan de hoy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />}
    </section>

    <RadarActions workspace={workspace} disabled={disabled} filter={planFilter} onFilterChange={setPlanFilter} />

    <section className="today-trends" aria-labelledby="today-trends-title">
      <div className="today-trends__heading"><div><p className="today-eyebrow today-eyebrow--pink">DESCUBRE LO QUE SE MUEVE <span aria-hidden="true">✦</span></p><h2 id="today-trends-title">Radar <em>Trends.</em></h2></div><span className="today-trends__badge">FUENTE NO CONECTADA</span></div>
      <p className="today-trends__note">Conecta una fuente de tendencias para descubrir qué está funcionando ahora.</p>
      <div className="today-trends__grid">
        <article className="today-trend today-trend--blue"><span className="today-trend__icon" aria-hidden="true">▶</span><div><h3>Vídeos</h3><p>Sin datos actuales</p></div><span className="today-trend__mark" aria-hidden="true">↗</span></article>
        <article className="today-trend today-trend--pink"><span className="today-trend__icon" aria-hidden="true">✳</span><div><h3>Publicaciones</h3><p>Sin datos actuales</p></div><span className="today-trend__mark" aria-hidden="true">↗</span></article>
        <article className="today-trend today-trend--green"><span className="today-trend__icon" aria-hidden="true">#</span><div><h3>Hashtags</h3><p>Sin datos actuales</p></div><span className="today-trend__mark" aria-hidden="true">↗</span></article>
      </div>
    </section>
  </div>
}

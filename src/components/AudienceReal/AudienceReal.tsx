import AudienceDataCollection from '../AudienceDataCollection/AudienceDataCollection'
import type { AudienceMetrics } from '../../types/audience'

export type AudiencePost = { id: string; media_type: string; views: number | null; likes: number | null; comments: number | null; saves: number | null; shares: number | null }
type Props = { records: AudienceMetrics[]; onSave: (record: AudienceMetrics) => void; posts: AudiencePost[]; loading: boolean; error: string }
const number = (value: number) => new Intl.NumberFormat('es-ES').format(value)
const date = (value: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
const formatName = (value: string) => ({ REEL: 'Reels', VIDEO: 'Vídeos', IMAGE: 'Imágenes', CAROUSEL: 'Carruseles', CAROUSEL_ALBUM: 'Carruseles' }[value.toUpperCase()] || value)

export default function AudienceReal({ records, onSave, posts, loading, error }: Props) {
  const latest = records.at(-1)
  const chartRecords = records.slice(-8)
  const maxFollowers = Math.max(...chartRecords.map((item) => item.totalFollowers), 1)
  const groups = Object.entries(posts.reduce<Record<string, number>>((all, post) => { const key = formatName(post.media_type); all[key] = (all[key] || 0) + 1; return all }, {})).sort((a, b) => b[1] - a[1])
  const withInteraction = posts.filter((post) => [post.likes, post.comments, post.saves, post.shares].some((value) => typeof value === 'number'))
  const interactions = withInteraction.reduce((total, post) => total + (post.likes || 0) + (post.comments || 0) + (post.saves || 0) + (post.shares || 0), 0)
  return <section className="aud-real" aria-labelledby="aud-real-title">
    <div className="aud-section-head"><div><p className="aud-kicker aud-kicker--green">02 / LA COMUNIDAD EN CIFRAS</p><h2 id="aud-real-title">Audiencia real</h2><p>Una mirada a tu comunidad y al contenido con el que interactúa.</p></div><span className="aud-chip">Datos disponibles</span></div>
    <div className="aud-real-grid">
      <article className="aud-card aud-demographics"><div className="aud-card-heading"><div><span className="aud-icon aud-icon--pink" aria-hidden="true">◎</span><h3>Perfil de seguidores</h3></div><span className="aud-label">REGISTRO MANUAL</span></div>
        {latest ? <><p className="aud-muted">Último registro: {date(latest.date)}</p><div className="aud-demo-values"><div><span>Edad principal</span><strong>{latest.topAgeRange || 'Sin datos'}</strong></div><div><span>Ubicación principal</span><strong>{[latest.topCity, latest.topCountry].filter(Boolean).join(', ') || 'Sin datos'}</strong></div></div>
          <div className="aud-gender"><div><span>Mujeres</span><strong>{latest.womenPercentage}%</strong></div><div className="aud-bar"><i style={{ width: `${Math.max(0, Math.min(100, latest.womenPercentage))}%` }} /></div><div><span>Hombres</span><strong>{latest.menPercentage}%</strong></div><div className="aud-bar aud-bar--blue"><i style={{ width: `${Math.max(0, Math.min(100, latest.menPercentage))}%` }} /></div></div>
          <p className="aud-footnote">Porcentajes registrados; no describen necesariamente a quienes interactúan ni incluyen otras categorías.</p></> : <div className="aud-empty"><span aria-hidden="true">◌</span><div><strong>Aún sin datos demográficos</strong><p>Registra las estadísticas de Instagram para ver la edad, género y ubicación principales.</p></div></div>}
      </article>
      <article className="aud-card aud-followers"><div className="aud-card-heading"><div><span className="aud-icon aud-icon--green" aria-hidden="true">↗</span><h3>Evolución de seguidores</h3></div><span className="aud-label">REGISTRO MANUAL</span></div>
        {latest ? <><strong className="aud-big-number">{number(latest.totalFollowers)}</strong><p className="aud-muted">Seguidores en el último registro · {date(latest.date)}</p>{chartRecords.length > 1 ? <div className="aud-follow-chart" role="img" aria-label={`Evolución de seguidores en ${chartRecords.length} registros: ${chartRecords.map((item) => `${date(item.date)}: ${number(item.totalFollowers)}`).join('; ')}`}>
          {chartRecords.map((item) => <div className="aud-follow-column" key={item.date}><span>{number(item.totalFollowers)}</span><div className="aud-follow-track"><i style={{ height: `${Math.max(3, item.totalFollowers / maxFollowers * 100)}%` }} /></div><small>{item.date.slice(5)}</small></div>)}</div> : <p className="aud-chart-hint">Añade otro registro en una fecha diferente para ver la evolución.</p>}</> : <div className="aud-empty"><span aria-hidden="true">↗</span><div><strong>Una historia por empezar</strong><p>Añade registros en distintas fechas para visualizar la evolución.</p></div></div>}
      </article>
      <article className="aud-card aud-content"><div className="aud-card-heading"><div><span className="aud-icon aud-icon--blue" aria-hidden="true">▤</span><h3>Contenido y actividad</h3></div><span className="aud-label">INSTAGRAM SINCRONIZADO</span></div>
        {loading ? <p className="aud-muted" role="status">Cargando publicaciones…</p> : error ? <p className="aud-error" role="alert">{error}</p> : posts.length ? <><div className="aud-content-stats"><div><strong>{number(posts.length)}</strong><span>publicaciones cargadas</span></div><div><strong>{withInteraction.length ? number(interactions) : '—'}</strong><span>interacciones registradas*</span></div></div><div className="aud-formats">{groups.map(([name, count]) => <div key={name}><span>{name}</span><div className="aud-bar aud-bar--blue"><i style={{ width: `${count / posts.length * 100}%` }} /></div><b>{count}</b></div>)}</div><p className="aud-footnote">Hasta 1.000 publicaciones sincronizadas. Distribución por formato publicado, no por consumo. *Suma de likes, comentarios, guardados y compartidos disponibles; algunas métricas pueden faltar.</p></> : <div className="aud-empty"><span aria-hidden="true">▤</span><div><strong>Sin publicaciones disponibles</strong><p>Sincroniza publicaciones desde el selector de cuentas para ver los formatos y las interacciones registradas.</p></div></div>}
      </article>
      <article className="aud-card aud-signals"><div className="aud-card-heading"><div><span className="aud-icon aud-icon--pink" aria-hidden="true">✳</span><h3>Señales por descubrir</h3></div></div><p>Intereses, segmentos más activos y consumo por tipo de audiencia requieren datos específicos que todavía no están disponibles en RADAR.</p><div className="aud-signal-row"><span>Intereses principales</span><b>Sin datos</b></div><div className="aud-signal-row"><span>Audiencia más implicada</span><b>Sin datos</b></div><div className="aud-signal-row"><span>Mayor crecimiento por segmento</span><b>Sin datos</b></div>{latest && <p className="aud-peak">◷ Actividad principal registrada: <strong>{latest.peakDay || '—'} · {latest.peakTime || '—'}</strong></p>}</article>
    </div>
    <details className="aud-manual"><summary>＋ Registrar o actualizar estadísticas de audiencia <span>Datos manuales de Instagram</span></summary><AudienceDataCollection records={records} onSave={onSave} /></details>
  </section>
}

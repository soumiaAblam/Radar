import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { interactionCount, monthlyFollowers, monthlyPublicationCounts, standoutPosts, type DashboardPost } from '../../lib/dashboardAnalytics'
import type { DailyMetrics } from '../../types/metrics'

type Props = { posts: DashboardPost[]; daily: DailyMetrics[]; loading: boolean; error: string; handle: string }
type Period = 'all' | '30' | '90'
const formatNumber = (value: number) => new Intl.NumberFormat('es-ES').format(value)
const prettyDate = (date: string | null) => date && !Number.isNaN(new Date(date).getTime()) ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Fecha no disponible'
const metrics = (post: DashboardPost) => [
  { icon: '♡', label: 'Me gusta', value: post.likes },
  { icon: '◉', label: 'Comentarios', value: post.comments },
  { icon: '▷', label: 'Visualizaciones', value: post.views },
]

function PostVisual({ post }: { post: DashboardPost }) {
  const [failed, setFailed] = useState(false)
  const url = post.thumbnail && /^https:\/\//i.test(post.thumbnail) ? post.thumbnail : null
  return <div className={`premium-post__visual premium-post__visual--${post.format}`}>
    {url && !failed ? <img src={url} alt={`Miniatura de ${post.title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="premium-post__placeholder" role="img" aria-label="Miniatura no disponible"><span aria-hidden="true">{post.format === 'reel' ? '▷' : post.format === 'carousel' ? '▦' : '◈'}</span><small>Vista no disponible</small></div>}
    <span className="premium-post__platform">◎ Instagram</span>
  </div>
}

function InteractionsChart({ posts, now }: { posts: DashboardPost[]; now: number }) {
  const points = useMemo(() => [...posts].filter((p) => p.publishedAt && !Number.isNaN(new Date(p.publishedAt).getTime()) && new Date(p.publishedAt).getTime() <= now).sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!)), [posts, now])
  if (!points.length) return <div className="premium-chart-empty"><span>⌁</span><strong>Aún no hay publicaciones con fecha</strong><p>Sincroniza tu cuenta para descubrir la evolución de tu contenido.</p></div>
  const values = points.map(interactionCount), maximum = Math.max(1, ...values)
  const firstTime = new Date(points[0].publishedAt!).getTime(), lastTime = new Date(points.at(-1)!.publishedAt!).getTime()
  const positions = values.map((value, index) => ({ x: firstTime === lastTime ? 50 : 3 + (new Date(points[index].publishedAt!).getTime() - firstTime) / (lastTime - firstTime) * 94, y: 89 - value / maximum * 75 }))
  const line = positions.map((p) => `${p.x},${p.y}`).join(' ')
  const first = positions[0], last = positions.at(-1)!
  return <><div className="premium-chart" role="group" aria-label="Interacciones actuales por fecha de publicación">
    <div className="premium-chart__grid"><span>{formatNumber(maximum)}</span><span>{formatNumber(Math.round(maximum / 2))}</span><span>0</span></div>
    <div className="premium-chart__plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="interactionsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2b7cff" stopOpacity=".24" /><stop offset="100%" stopColor="#2b7cff" stopOpacity="0" /></linearGradient></defs><path d={`M ${first.x} 100 L ${positions.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${last.x} 100 Z`} fill="url(#interactionsFill)" /><polyline points={line} fill="none" stroke="#246df0" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {positions.map((position, index) => <button key={points[index].id} className="premium-chart__point" style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`${prettyDate(points[index].publishedAt)}: ${formatNumber(values[index])} interacciones`} data-tip={`${prettyDate(points[index].publishedAt)} · ${formatNumber(values[index])} interacciones`} type="button" />)}
    </div>
  </div><div className="premium-chart__dates"><span>{prettyDate(points[0].publishedAt)}</span><span>{prettyDate(points.at(-1)!.publishedAt)}</span></div><p className="premium-chart__note">Interacciones registradas actualmente en cada publicación (likes, comentarios, guardados y compartidos). No representa una serie histórica de interacciones diarias.</p></>
}

function MonthlyChart({ posts }: { posts: DashboardPost[] }) {
  const months = monthlyPublicationCounts(posts), maximum = Math.max(1, ...months.map((month) => month.count))
  const hasDatedPosts = months.some((month) => month.count > 0)
  if (!hasDatedPosts) return <div className="premium-chart-empty premium-chart-empty--short"><span>▥</span><strong>Sin publicaciones en los últimos 12 meses</strong><p>Las publicaciones con fecha aparecerán aquí.</p></div>
  return <><div className="premium-month-chart" role="group" aria-label="Número de publicaciones por mes, últimos 12 meses">{months.map((month, index) => <div className="premium-month-chart__item" key={month.key}><button type="button" className="premium-month-chart__track" data-tip={`${month.key}: ${month.count} publicaciones${index === months.length - 1 ? ' · mes actual' : ''}`} aria-label={`${month.key}: ${month.count} publicaciones${index === months.length - 1 ? ', mes actual' : ''}`}><span style={{ height: `${Math.max(month.count ? 8 : 0, month.count / maximum * 100)}%` }} /></button><span>{month.label}</span></div>)}</div><p className="premium-chart__note">Publicaciones guardadas por mes, incluidas las manuales. La última barra representa el mes actual. La sincronización puede limitar el historial importado.</p></>
}

function PostCard({ post, reasons, rank }: { post: DashboardPost; reasons?: string[]; rank?: number }) {
  return <article className="premium-post"><PostVisual post={post} /><div className="premium-post__body"><div className="premium-post__eyebrow">{rank && <span className="premium-post__rank">#{String(rank).padStart(2, '0')}</span>}<span>{prettyDate(post.publishedAt)}</span><span>·</span><span>{post.format === 'reel' ? 'Reel' : post.format === 'carousel' ? 'Carrusel' : post.format === 'story' ? 'Historia' : 'Imagen'}</span></div>{reasons && <div className="premium-post__badges">{reasons.map((reason) => <span key={reason}>✦ {reason}</span>)}</div>}<h3>{post.title || 'Publicación de Instagram'}</h3><div className="premium-post__metrics">{metrics(post).map((metric) => <span key={metric.label} aria-label={`${metric.label}: ${metric.value === null ? 'sin datos' : formatNumber(metric.value)}`}><i aria-hidden="true">{metric.icon}</i> {metric.value === null ? '—' : formatNumber(metric.value)}</span>)}</div></div></article>
}

export default function DashboardPerformance({ posts, daily, loading, error, handle }: Props) {
  const [period, setPeriod] = useState<Period>('all')
  const [now] = useState(() => Date.now())
  const periodPosts = useMemo(() => {
    if (period === 'all') return posts
    const threshold = now - Number(period) * 86400000
    return posts.filter((post) => { const time = post.publishedAt ? new Date(post.publishedAt).getTime() : NaN; return Number.isFinite(time) && time >= threshold && time <= now })
  }, [posts, period, now])
  const interactions = periodPosts.reduce((sum, post) => sum + interactionCount(post), 0)
  const viewsAvailable = periodPosts.some((post) => post.views !== null)
  const views = periodPosts.reduce((sum, post) => sum + (post.views ?? 0), 0)
  const dated = [...periodPosts].filter((post) => post.publishedAt && !Number.isNaN(new Date(post.publishedAt).getTime()) && new Date(post.publishedAt).getTime() <= now).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))
  const comparisonSize = Math.floor(dated.length / 2)
  const recentAverage = comparisonSize ? dated.slice(0, comparisonSize).reduce((sum, post) => sum + interactionCount(post), 0) / comparisonSize : null
  const earlierAverage = comparisonSize ? dated.slice(comparisonSize, comparisonSize * 2).reduce((sum, post) => sum + interactionCount(post), 0) / comparisonSize : null
  const interactionVariation = recentAverage !== null && earlierAverage !== null && earlierAverage > 0 ? ((recentAverage - earlierAverage) / earlierAverage) * 100 : null
  const followers = monthlyFollowers(daily, new Date(now))
  const periodDaily = daily.filter((record) => { const time = new Date(`${record.date}T12:00:00`).getTime(); return Number.isFinite(time) && time <= now && (period === 'all' || time >= now - Number(period) * 86400000) })
  const dailyReach = periodDaily.reduce((sum, record) => sum + record.reach, 0)
  const followerDelta = followers.previous !== null && followers.beforePrevious !== null ? followers.previous - followers.beforePrevious : null
  const leaders = standoutPosts(posts)
  const top = [...periodPosts].filter((post) => interactionCount(post) > 0).sort((a, b) => interactionCount(b) - interactionCount(a)).slice(0, 3)
  const label = period === 'all' ? 'Todo el historial' : `Últimos ${period} días`
  return <>
    <section className="premium-hero" aria-labelledby="summary-title"><div className="premium-hero__copy"><p className="premium-kicker">TU ESPACIO DE CRECIMIENTO <span>✦</span></p><h1 id="summary-title">Cada dato cuenta<span>.</span><br /><em>Hagamos que crezca.</em></h1><p>Hola, <strong>@{handle}</strong>. Aquí empieza tu próxima gran idea: descubre qué funciona y decide qué viene después.</p><div className="premium-hero__meta"><span><i /> TU RESUMEN ESTRATÉGICO</span><span>◎ INSTAGRAM</span></div></div><div className="premium-hero__art" aria-hidden="true"><div className="premium-hero__orbit premium-hero__orbit--one"/><div className="premium-hero__orbit premium-hero__orbit--two"/><div className="premium-hero__spark premium-hero__spark--one">✦</div><div className="premium-hero__spark premium-hero__spark--two">✳</div><div className="premium-hero__card"><span>EL PROGRESO SE CONSTRUYE</span><strong>Un paso<br /><i>a la vez.</i></strong><div>↗ <span>IDEAS QUE CRECEN</span></div></div></div></section>

    <section className="premium-overview" aria-labelledby="performance-title"><div className="premium-section-head"><div><p className="premium-kicker">01 / EVOLUCIÓN Y RENDIMIENTO</p><h2 id="performance-title">Tu crecimiento, en perspectiva<span className="premium-dot">.</span></h2><p>Una visión clara de las señales que importan.</p></div><label className="premium-period">Periodo <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Periodo de rendimiento"><option value="all">Todo el historial</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></label></div>
      {error && <div className="premium-alert" role="alert">No se han podido cargar las publicaciones sincronizadas. {error}</div>}
      {loading ? <div className="premium-loading" role="status">Cargando los datos de la cuenta…</div> : <><div className="premium-kpis">
        <article className="premium-kpi premium-kpi--primary"><div><span className="premium-kpi__icon">↗</span><span>SALDO DE SEGUIDORES · MES PASADO</span></div><strong>{followers.previous === null ? '—' : `${followers.previous > 0 ? '+' : ''}${formatNumber(followers.previous)}`}</strong><p>{followers.previous === null ? 'Necesitamos registros al comienzo de ambos meses.' : followerDelta === null ? 'Diferencia neta; sin datos para comparar con el mes anterior.' : `${followerDelta > 0 ? '+' : ''}${formatNumber(followerDelta)} frente al mes anterior`}</p><i aria-hidden="true">✳</i></article>
        <article className="premium-kpi premium-kpi--interactions"><div><span className="premium-kpi__icon premium-kpi__icon--pink">♡</span><span>INTERACCIONES</span></div><strong>{periodPosts.length ? formatNumber(interactions) : '—'}</strong><p>Likes, comentarios, guardados y compartidos · {label.toLowerCase()}</p></article>
        <article className="premium-kpi premium-kpi--views"><div><span className="premium-kpi__icon premium-kpi__icon--green">◉</span><span>VISUALIZACIONES</span></div><strong>{periodPosts.length && viewsAvailable ? formatNumber(views) : '—'}</strong><p>En publicaciones registradas · {label.toLowerCase()}</p></article>
        <article className="premium-kpi premium-kpi--posts"><div><span className="premium-kpi__icon">▦</span><span>PUBLICACIONES</span></div><strong>{formatNumber(periodPosts.length)}</strong><p>Contenido disponible · {label.toLowerCase()}</p></article>
      </div>
      <div className="premium-data-note">ⓘ Las métricas proceden de los datos guardados; un valor en cero puede indicar que Meta no facilitó esa métrica. Los seguidores se calculan solo con registros manuales en los límites de cada mes.{periodDaily.length > 0 && <> Alcance: <strong>{formatNumber(dailyReach)}</strong> (suma de registros diarios manuales; puede incluir personas repetidas).</>}</div>
      <div className="premium-charts"><article className="premium-panel premium-chart-card"><div className="premium-card-head"><div><p className="premium-kicker">EL PULSO DE TU CONTENIDO</p><h3>Interacciones por publicación</h3><p>Desde tus publicaciones hasta hoy · {label}</p></div><span className="premium-chart-tag"><i /> Interacciones</span></div>{interactionVariation !== null && <p className="premium-comparison">{interactionVariation > 0 ? '+' : ''}{interactionVariation.toFixed(1).replace('.', ',')}% <span>promedio de las {comparisonSize} publicaciones más recientes frente a las {comparisonSize} anteriores</span></p>}<InteractionsChart posts={periodPosts} now={now} /></article><article className="premium-panel premium-chart-card"><div className="premium-card-head"><div><p className="premium-kicker">CONSISTENCIA QUE SUMA</p><h3>Tu ritmo de publicación</h3><p>Últimos 12 meses</p></div><span className="premium-chart-icon">▥</span></div><MonthlyChart posts={posts} /></article></div></>}
    </section>

    <section className="premium-featured" aria-labelledby="featured-title"><div className="premium-section-head"><div><p className="premium-kicker">02 / PUBLICACIONES DESTACADAS</p><h2 id="featured-title">Contenido que deja huella<span className="premium-dot">.</span></h2><p>Las piezas que están contando tu historia.</p></div><Link className="premium-text-link" to="/publicaciones">Ver publicaciones <span>↗</span></Link></div>
    {loading ? <div className="premium-loading" role="status">Cargando publicaciones…</div> : <><div className="premium-subhead"><div><span>01</span><h3>El top 3 de tu contenido</h3></div><p>Por interacciones registradas · {label.toLowerCase()}</p></div>{top.length ? <div className="premium-post-grid">{top.map((post, index) => <PostCard key={post.id} post={post} rank={index + 1} />)}</div> : <div className="premium-empty"><span className="premium-empty__icon">✧</span><div><strong>Aún no hay un top de publicaciones.</strong><p>Cuando haya publicaciones con interacciones registradas, podrás descubrir cuáles destacan.</p></div></div>}
    <div className="premium-subhead premium-subhead--stars"><div><span>02</span><h3>Las estrellas del feed</h3></div><p>En todo el historial · los empates se muestran juntos</p></div>{leaders.length ? <div className="premium-post-grid">{leaders.map(({ post, reasons }) => <PostCard key={post.id} post={post} reasons={reasons} />)}</div> : <div className="premium-empty"><span className="premium-empty__icon premium-empty__icon--pink">✦</span><div><strong>Tus próximas estrellas aparecerán aquí.</strong><p>Necesitamos comentarios, visualizaciones o likes registrados para identificar las publicaciones destacadas.</p></div></div>}</>}
    </section>
  </>
}

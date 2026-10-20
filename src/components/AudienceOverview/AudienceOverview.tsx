import type { AudienceMetrics } from '../../types/audience'
import './audience-overview.css'

type AudienceOverviewProps = {
  latestRecord?: AudienceMetrics
}

function AudienceOverview({ latestRecord }: AudienceOverviewProps) {
  if (!latestRecord) {
    return <section className="audience-overview audience-overview--empty"><h2>Resumen de audiencia</h2><p>Aún no hay datos. Añade tu primer registro manual para rellenar estas tarjetas.</p></section>
  }

  const netBalance = latestRecord.newFollowers - latestRecord.lostFollowers
  const cards = [
    { label: 'Seguidores actuales', value: latestRecord.totalFollowers.toLocaleString('es-ES') },
    { label: 'Nuevos seguidores', value: `+${latestRecord.newFollowers}` },
    { label: 'Balance neto', value: `${netBalance >= 0 ? '+' : ''}${netBalance}` },
    { label: 'Edad principal', value: latestRecord.topAgeRange },
    { label: 'País principal', value: latestRecord.topCountry },
    { label: 'Ciudad principal', value: latestRecord.topCity },
  ]

  return (
    <section className="audience-overview" aria-labelledby="audience-overview-title">
      <header><div><p>ÚLTIMO REGISTRO · {latestRecord.date}</p><h2 id="audience-overview-title">Tu audiencia de un vistazo</h2></div><span>{latestRecord.peakDay}, {latestRecord.peakTime}</span></header>
      <div className="audience-overview__cards">
        {cards.map((card) => <article key={card.label}><span>{card.label}</span><strong>{card.value || '—'}</strong></article>)}
      </div>
      <div className="audience-overview__details"><p><b>Mujeres</b> {latestRecord.womenPercentage}%</p><p><b>Hombres</b> {latestRecord.menPercentage}%</p><p><b>Mayor actividad</b> {latestRecord.peakDay}, {latestRecord.peakTime}</p></div>
    </section>
  )
}

export default AudienceOverview

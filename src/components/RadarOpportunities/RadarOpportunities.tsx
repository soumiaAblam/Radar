import type { RadarOpportunity } from '../../lib/radarAnalytics'
import './radar-opportunities.css'

type RadarOpportunitiesProps = { opportunities: RadarOpportunity[] }

function RadarOpportunities({ opportunities }: RadarOpportunitiesProps) {
  return (
    <section className="radar-opportunities" aria-labelledby="radar-opportunities-title">
      <div className="radar-section-heading">
        <div><p>OPORTUNIDADES PRIORITARIAS</p><h2 id="radar-opportunities-title">Señales que merece la pena explorar</h2></div>
        <span>Basado en publicaciones y métricas</span>
      </div>
      <div className="radar-opportunities__grid">
        {opportunities.map((opportunity) => (
          <article className={`radar-opportunity radar-opportunity--${opportunity.tone}`} key={opportunity.title}>
            <span className="radar-opportunity__marker" aria-hidden="true" />
            <p>{opportunity.title}</p><strong>{opportunity.insight}</strong><small>{opportunity.evidence}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RadarOpportunities

import type { RadarAccount } from '../../context/AccountContext'
import type { PublicationRecord } from '../../types/publication'
import './radar-overview.css'

type RadarOverviewProps = { account: RadarAccount, records: PublicationRecord[] }

function RadarOverview({ account, records }: RadarOverviewProps) {
  const hasEnoughData = records.length >= 3

  return (
    <section className="radar-overview" aria-label="Estado del Radar">
      <div>
        <p className="section-kicker">RADAR ESTRATÉGICO</p>
        <h1>Detecta qué probar a continuación.</h1>
        <p>Convertimos las señales de @{account.handle} en decisiones concretas para la próxima semana.</p>
      </div>
      <aside className="radar-overview__status">
        <span>{hasEnoughData ? 'ANÁLISIS ACTIVO' : 'RECOPILANDO DATOS'}</span>
        <strong>{records.length} publicación{records.length === 1 ? '' : 'es'} analizada{records.length === 1 ? '' : 's'}</strong>
        <small>{hasEnoughData ? 'Las oportunidades se actualizan con los datos de esta cuenta.' : 'Añade o sincroniza al menos 3 publicaciones para confirmar patrones.'}</small>
      </aside>
    </section>
  )
}

export default RadarOverview

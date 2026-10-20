import type { SummaryAnalysis } from '../../lib/summaryAnalytics'
import './weekly-diagnosis.css'

type WeeklyDiagnosisProps = { recordCount: number; analysis: SummaryAnalysis }

function WeeklyDiagnosis({ recordCount, analysis }: WeeklyDiagnosisProps) {
  const remainingRecords = Math.max(14 - recordCount, 0)

  return (
    <section className="weekly-diagnosis" aria-labelledby="weekly-diagnosis-title">
      <div className="weekly-diagnosis__heading">
        <div>
          <p className="weekly-diagnosis__eyebrow">DIAGNÓSTICO SEMANAL</p>
          <h2 id="weekly-diagnosis-title">Tu cuenta, en un vistazo</h2>
          <p>Comparamos los últimos siete registros con los siete anteriores y distinguimos cambios puntuales de una base de datos todavía insuficiente.</p>
        </div>
        <span className="weekly-diagnosis__status">{analysis.ready ? 'Comparativa lista' : `${recordCount}/14 días registrados`}</span>
      </div>
      <div className="weekly-diagnosis__empty">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15v-3M12 15V9M16 15V7" /></svg>
        <div>
          <strong>{analysis.ready ? 'Ya tenemos una comparación semanal basada en datos.' : 'Todavía estamos recopilando información.'}</strong>
          <p>{analysis.ready ? 'Los bloques de logros, alertas, oportunidades y recomendaciones ya se actualizan con los cambios calculados. Necesitaremos más historial para confirmar tendencias mensuales sostenidas.' : `Registra ${remainingRecords} día${remainingRecords === 1 ? '' : 's'} más para comparar una semana completa con la anterior.`}</p>
        </div>
      </div>
    </section>
  )
}

export default WeeklyDiagnosis

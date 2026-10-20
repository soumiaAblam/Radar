import { useState } from 'react'
import type { DailyMetrics } from '../../types/metrics'
import './growth-overview.css'

type GrowthOverviewProps = { records: DailyMetrics[] }

function GrowthOverview({ records }: GrowthOverviewProps) {
  const [period, setPeriod] = useState<'Semanal' | 'Mensual'>('Semanal')
  const latestRecord = records[records.length - 1]
  const engagement = latestRecord && latestRecord.reach > 0 ? ((latestRecord.likes + latestRecord.saves + latestRecord.shares) / latestRecord.reach) * 100 : null

  return (
    <section className="growth-overview" aria-labelledby="growth-overview-title">
      <header>
        <div><p>EVOLUCIÓN</p><h2 id="growth-overview-title">Indicadores de crecimiento</h2></div>
        <div className="growth-overview__filters">
          {(['Semanal', 'Mensual'] as const).map((option) => <button type="button" className={period === option ? 'growth-overview__filter growth-overview__filter--active' : 'growth-overview__filter'} onClick={() => setPeriod(option)} key={option}>{option}</button>)}
        </div>
      </header>
      <div className="growth-overview__chart" aria-label={`Gráfica ${period.toLowerCase()} sin datos suficientes`}><span>{records.length ? `${records.length} registro${records.length === 1 ? '' : 's'} disponible${records.length === 1 ? '' : 's'}. Faltan datos para dibujar la evolución ${period.toLowerCase()}.` : `No hay datos de evolución ${period.toLowerCase()} todavía.`}</span></div>
      <div className="growth-overview__metrics">
        <div><span>Seguidores</span><strong>{latestRecord ? latestRecord.followers.toLocaleString('es-ES') : '—'}</strong></div>
        <div><span>Alcance</span><strong>{latestRecord ? latestRecord.reach.toLocaleString('es-ES') : '—'}</strong></div>
        <div><span>Engagement</span><strong>{engagement === null ? '—' : `${engagement.toFixed(1)} %`}</strong></div>
      </div>
    </section>
  )
}

export default GrowthOverview

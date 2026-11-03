import { useMemo, useState, type CSSProperties } from 'react'
import type { DailyMetrics } from '../../types/metrics'
import './growth-overview.css'

type GrowthOverviewProps = { records: DailyMetrics[] }

function GrowthOverview({ records }: GrowthOverviewProps) {
  const [period, setPeriod] = useState<'Semanal' | 'Mensual'>('Semanal')
  const latestRecord = records[records.length - 1]
  const engagement = latestRecord && latestRecord.reach > 0 ? ((latestRecord.likes + latestRecord.saves + latestRecord.shares) / latestRecord.reach) * 100 : null
  const chartRecords = useMemo(() => records.slice(period === 'Semanal' ? -7 : -12), [period, records])
  const highestReach = Math.max(...chartRecords.map((record) => record.reach), 1)

  return (
    <section className="growth-overview" aria-labelledby="growth-overview-title">
      <header>
        <div><p>EVOLUCIÓN</p><h2 id="growth-overview-title">Indicadores de crecimiento</h2></div>
        <div className="growth-overview__filters">
          {(['Semanal', 'Mensual'] as const).map((option) => <button type="button" className={period === option ? 'growth-overview__filter growth-overview__filter--active' : 'growth-overview__filter'} onClick={() => setPeriod(option)} key={option}>{option}</button>)}
        </div>
      </header>
      <div className="growth-overview__chart" aria-label={`Gráfica ${period.toLowerCase()} de alcance`}>
        {chartRecords.length ? <div className="growth-overview__bars" role="img" aria-label={`Alcance de ${chartRecords.length} registros`}>{chartRecords.map((record, index) => {
          const height = Math.max(7, Math.round((record.reach / highestReach) * 100))
          const label = new Date(`${record.date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
          return <div className="growth-overview__bar-wrap" key={record.date} title={`${label}: ${record.reach.toLocaleString('es-ES')} de alcance`}>
            <i className="growth-overview__bar" style={{ '--growth-height': `${height}%`, '--growth-delay': `${index * 70}ms` } as CSSProperties} />
            <small>{label}</small>
          </div>
        })}</div> : <span>No hay datos de evolución {period.toLowerCase()} todavía.</span>}
      </div>
      <div className="growth-overview__metrics">
        <div><span>Seguidores</span><strong>{latestRecord ? latestRecord.followers.toLocaleString('es-ES') : '—'}</strong></div>
        <div><span>Alcance</span><strong>{latestRecord ? latestRecord.reach.toLocaleString('es-ES') : '—'}</strong></div>
        <div><span>Engagement</span><strong>{engagement === null ? '—' : `${engagement.toFixed(1)} %`}</strong></div>
      </div>
    </section>
  )
}

export default GrowthOverview

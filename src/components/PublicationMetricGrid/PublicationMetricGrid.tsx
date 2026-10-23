import { getAverageEngagement } from '../../lib/publicationAnalytics'
import type { PublicationRecord } from '../../types/publication'
import './publication-metric-grid.css'

type PublicationMetricGridProps = { records: PublicationRecord[] }

function PublicationMetricGrid({ records }: PublicationMetricGridProps) {
  const total = (key: 'views' | 'saves' | 'shares') => records.reduce((sum, record) => sum + record[key], 0)
  const metrics = [
    { label: 'Visualizaciones', value: total('views').toLocaleString('es-ES') },
    { label: 'Engagement', value: `${getAverageEngagement(records).toFixed(1)}%` },
    { label: 'Guardados', value: total('saves').toLocaleString('es-ES') },
    { label: 'Compartidos', value: total('shares').toLocaleString('es-ES') },
  ]

  return (
    <section className="publication-metric-grid" aria-label="Resumen de métricas de publicaciones">
      {metrics.map((metric) => (
        <article className="publication-metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{records.length ? metric.value : '—'}</strong>
          <small>{records.length ? `${records.length} publicaciones registradas` : 'Sin datos todavía'}</small>
        </article>
      ))}
    </section>
  )
}

export default PublicationMetricGrid

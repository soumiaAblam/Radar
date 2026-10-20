import type { SummaryAnalysis } from '../../lib/summaryAnalytics'
import './summary-insight-cards.css'

type SummaryInsightCardsProps = { analysis: SummaryAnalysis }

function percentage(value: number | null) {
  return value === null ? 'sin base comparable' : `${value > 0 ? '+' : ''}${Math.round(value)} %`
}

function SummaryInsightCards({ analysis }: SummaryInsightCardsProps) {
  const topAchievement = analysis.achievements[0]
  const topAlert = analysis.alerts[0]
  const cards = [
    { title: 'Logros', description: topAchievement ? `${topAchievement.label}: ${percentage(topAchievement.percentage)} frente a la semana anterior.` : 'Las mejoras y objetivos conseguidos aparecerán aquí.', detail: topAchievement ? `${topAchievement.current.toLocaleString('es-ES')} esta semana` : 'Sin datos todavía', tone: 'blue' },
    { title: 'Alertas', description: topAlert ? `${topAlert.label}: ${percentage(topAlert.percentage)} frente a la semana anterior.` : 'Detectaremos qué métricas o contenidos necesitan atención.', detail: topAlert ? `${topAlert.current.toLocaleString('es-ES')} esta semana` : 'Sin datos todavía', tone: 'pink' },
    { title: 'Oportunidades', description: analysis.opportunities[0] ?? 'Aquí encontrarás temas, formatos y acciones por explorar.', detail: analysis.ready ? 'Basado en datos semanales' : 'Sin datos todavía', tone: 'sky' },
    { title: 'Recomendaciones prioritarias', description: analysis.recommendations[0] ?? 'Mostraremos las acciones con mayor impacto para esta semana.', detail: analysis.ready ? 'Justificada con datos' : 'Sin datos todavía', tone: 'green' },
  ]

  return (
    <section className="summary-insight-cards" aria-label="Resumen de hallazgos">
      {cards.map((card) => (
        <article className={`summary-insight-card summary-insight-card--${card.tone}`} key={card.title}>
          <span className="summary-insight-card__marker" aria-hidden="true" />
          <h2>{card.title}</h2>
          <p>{card.description}</p>
          <small>{card.detail}</small>
        </article>
      ))}
    </section>
  )
}

export default SummaryInsightCards

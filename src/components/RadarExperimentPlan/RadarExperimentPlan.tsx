import type { RadarExperiment } from '../../lib/radarAnalytics'
import './radar-experiment-plan.css'

type RadarExperimentPlanProps = { experiments: RadarExperiment[] }

function RadarExperimentPlan({ experiments }: RadarExperimentPlanProps) {
  return (
    <section className="radar-experiment-plan" aria-labelledby="radar-experiments-title">
      <div className="radar-section-heading"><div><p className="radar-experiment-plan__eyebrow">PLAN DE EXPERIMENTOS</p><h2 id="radar-experiments-title">Tres pruebas para la próxima semana</h2></div><span>Elige una y mide el resultado</span></div>
      <ol className="radar-experiment-plan__list">{experiments.map((experiment) => <li key={experiment.number}><span>{experiment.number}</span><div><h3>{experiment.title}</h3><p>{experiment.description}</p></div><strong>{experiment.metric}</strong></li>)}</ol>
    </section>
  )
}

export default RadarExperimentPlan

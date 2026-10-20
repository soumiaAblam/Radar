import { useEffect, useMemo, useState } from 'react'
import { createGoalSuggestions, type GoalSuggestion } from '../../lib/summaryAnalytics'
import type { DailyMetrics } from '../../types/metrics'
import './weekly-plan.css'

type WeeklyPlanProps = { records: DailyMetrics[] }

const manualGoals: GoalSuggestion[] = [
  { id: 'followers', label: 'Nuevos seguidores', target: 0, current: 0, unit: 'seguidores' },
  { id: 'views', label: 'Visualizaciones', target: 0, current: 0, unit: 'visualizaciones' },
  { id: 'reach', label: 'Alcance', target: 0, current: 0, unit: 'personas' },
  { id: 'engagement', label: 'Engagement', target: 0, current: 0, unit: '%' },
  { id: 'reels', label: 'Reels', target: 0, current: 0, unit: 'publicaciones' },
  { id: 'carousels', label: 'Carruseles', target: 0, current: 0, unit: 'publicaciones' },
  { id: 'stories', label: 'Historias', target: 0, current: 0, unit: 'días' },
]

function WeeklyPlan({ records }: WeeklyPlanProps) {
  const suggestedGoals = useMemo(() => createGoalSuggestions(records), [records])
  const [goals, setGoals] = useState(manualGoals)
  const [isEditing, setIsEditing] = useState(false)
  const [hasAppliedSuggestion, setHasAppliedSuggestion] = useState(false)

  useEffect(() => {
    if (suggestedGoals.length && !hasAppliedSuggestion) {
      setGoals(suggestedGoals)
      setHasAppliedSuggestion(true)
    }
  }, [suggestedGoals, hasAppliedSuggestion])

  const updateGoal = (index: number, target: string) => {
    setGoals((currentGoals) => currentGoals.map((goal, goalIndex) => goalIndex === index ? { ...goal, target: Number(target) } : goal))
  }

  const hasTargets = goals.some((goal) => goal.target > 0)

  return (
    <section className="weekly-plan" aria-labelledby="weekly-plan-title">
      <header>
        <div><p>MI PLAN SEMANAL</p><h2 id="weekly-plan-title">Objetivos de crecimiento</h2></div>
        <button type="button" onClick={() => setIsEditing((editing) => !editing)}>{isEditing ? 'Guardar metas' : 'Editar metas'}</button>
      </header>
      <p className="weekly-plan__intro">{suggestedGoals.length ? 'Propuesta calculada a partir del último período semanal. Puedes ajustarla antes de guardarla.' : 'Registra al menos catorce días para calcular metas con una semana de referencia y otra de comparación. Mientras tanto, puedes definirlas manualmente.'}</p>
      <div className="weekly-plan__goals">
        {goals.map((goal, index) => (
          <article className="weekly-plan__goal" key={goal.id}>
            <div><strong>{goal.label}</strong>{isEditing ? <label><input type="number" min="0" placeholder="Meta" value={goal.target || ''} onChange={(event) => updateGoal(index, event.target.value)} /><span>{goal.unit}</span></label> : <span>{goal.target ? `${goal.target.toLocaleString('es-ES')} ${goal.unit}` : 'Pendiente de calcular'}</span>}</div>
            <div className="weekly-plan__track"><i /></div>
          </article>
        ))}
      </div>
      <p className="weekly-plan__empty">{hasTargets ? 'Las metas se mantienen estables. El progreso diario se calculará desde la fecha de inicio del objetivo cuando se guarden en Supabase.' : 'No hay objetivos calculados todavía.'}</p>
    </section>
  )
}

export default WeeklyPlan

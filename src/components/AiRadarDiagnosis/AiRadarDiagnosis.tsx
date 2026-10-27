import { useEffect, useState } from 'react'
import type { RadarAccount } from '../../context/AccountContext'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import './ai-radar-diagnosis.css'

type Diagnosis = {
  executiveSummary: string
  dataQuality: 'insufficient' | 'limited' | 'ready'
  dataNote: string
  keyFinding: { title: string, finding: string, evidence: string }
  opportunities: Array<{ title: string, insight: string, evidence: string, priority: 'alta' | 'media' }>
  alerts: Array<{ title: string, detail: string, severity: 'info' | 'attention' }>
  experiments: Array<{ title: string, description: string, metric: string, expectedSignal: string }>
}

type Props = { account: RadarAccount, recordsCount: number }

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function AiRadarDiagnosis({ account, recordsCount }: Props) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setDiagnosis(null)
    setGeneratedAt(null)
    setError('')
    if (account.source !== 'instagram') return () => { active = false }

    const loadSavedDiagnosis = async () => {
      try {
        await ensureDemoSession()
        const { data, error: queryError } = await supabase
          .from('weekly_diagnoses')
          .select('analysis, generated_at')
          .eq('account_id', account.id)
          .eq('status', 'ready')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (queryError) throw queryError
        if (active && data?.analysis) {
          setDiagnosis(data.analysis as Diagnosis)
          setGeneratedAt(data.generated_at)
        }
      } catch {
        // La generación seguirá disponible aunque aún no haya un diagnóstico guardado.
      }
    }
    void loadSavedDiagnosis()
    return () => { active = false }
  }, [account.id, account.source])

  const generate = async () => {
    setIsLoading(true)
    setError('')
    try {
      await ensureDemoSession()
      const { data, error: invokeError } = await supabase.functions.invoke('instagram-ai-diagnosis', {
        body: { accountId: account.id, force: Boolean(diagnosis) },
      })
      if (invokeError) throw invokeError
      if (data?.error) throw new Error(data.error)
      setDiagnosis(data.diagnosis as Diagnosis)
      setGeneratedAt(data.generatedAt ?? new Date().toISOString())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se ha podido generar el análisis.')
    } finally {
      setIsLoading(false)
    }
  }

  if (account.source === 'demo') {
    return (
      <section className="ai-radar ai-radar--setup" aria-labelledby="ai-radar-title">
        <div><p className="section-kicker">AGENTE IA</p><h2 id="ai-radar-title">Análisis personalizado</h2><p>Conecta una cuenta profesional de Instagram y sincroniza sus publicaciones para activar el análisis con IA.</p></div>
        <span className="ai-radar__badge">Disponible para cuentas conectadas</span>
      </section>
    )
  }

  return (
    <section className="ai-radar" aria-labelledby="ai-radar-title">
      <header className="ai-radar__header">
        <div><p className="section-kicker">AGENTE IA · BETA</p><h2 id="ai-radar-title">Tu lectura estratégica personalizada</h2><p>Gemini interpreta las métricas sincronizadas de @{account.handle} y propone próximas acciones. El análisis se guarda para evitar llamadas innecesarias.</p></div>
        <button type="button" className="ai-radar__button" onClick={() => void generate()} disabled={isLoading || recordsCount === 0}>
          {isLoading ? 'Analizando datos…' : diagnosis ? 'Actualizar análisis' : 'Generar análisis con IA'}
        </button>
      </header>

      {recordsCount === 0 && <p className="ai-radar__notice">Sincroniza publicaciones antes de pedir el análisis.</p>}
      {error && <p className="ai-radar__error" role="alert">{error}</p>}

      {diagnosis ? (
        <div className="ai-radar__result">
          <div className="ai-radar__summary"><span className={`ai-radar__quality ai-radar__quality--${diagnosis.dataQuality}`}>{diagnosis.dataQuality === 'ready' ? 'DATOS LISTOS' : diagnosis.dataQuality === 'limited' ? 'MUESTRA LIMITADA' : 'DATOS INSUFICIENTES'}</span><strong>{diagnosis.executiveSummary}</strong><p>{diagnosis.dataNote}</p>{generatedAt && <small>Último análisis: {formatDate(generatedAt)}</small>}</div>
          <article className="ai-radar__finding"><p>SEÑAL PRINCIPAL</p><h3>{diagnosis.keyFinding.title}</h3><strong>{diagnosis.keyFinding.finding}</strong><small>{diagnosis.keyFinding.evidence}</small></article>
          <div className="ai-radar__columns">
            <div><h3>Oportunidades</h3><ul>{diagnosis.opportunities.map((item) => <li key={`${item.title}-${item.evidence}`}><span>{item.priority}</span><strong>{item.title}</strong><p>{item.insight}</p><small>{item.evidence}</small></li>)}</ul></div>
            <div><h3>Experimentos sugeridos</h3><ol>{diagnosis.experiments.map((item) => <li key={`${item.title}-${item.metric}`}><strong>{item.title}</strong><p>{item.description}</p><small>{item.metric} · {item.expectedSignal}</small></li>)}</ol></div>
          </div>
          {diagnosis.alerts.length > 0 && <div className="ai-radar__alerts">{diagnosis.alerts.map((alert) => <p key={`${alert.title}-${alert.detail}`} className={alert.severity === 'attention' ? 'attention' : ''}><strong>{alert.title}:</strong> {alert.detail}</p>)}</div>}
        </div>
      ) : !isLoading && recordsCount > 0 && <p className="ai-radar__empty">Genera el primer análisis cuando quieras. Se basará únicamente en las publicaciones y métricas ya sincronizadas.</p>}
    </section>
  )
}

export default AiRadarDiagnosis

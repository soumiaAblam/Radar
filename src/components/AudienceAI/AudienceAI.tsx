import { useState } from 'react'
import type { RadarAccount } from '../../context/AccountContext'
import { audienceFields, type AudienceProfile } from '../../lib/audienceStrategy'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { AudienceMetrics } from '../../types/audience'
import type { AudiencePost } from '../AudienceReal/AudienceReal'

type Analysis = { summary: string; limitations: string; matches: string[]; differences: string[]; activeSegments: string; strategy: string; recommendations: { priority: string; action: string; reason: string }[] }
type Props = { account: RadarAccount; profile: AudienceProfile; latest?: AudienceMetrics; posts: AudiencePost[] }

export default function AudienceAI({ account, profile, latest, posts }: Props) {
  const [result, setResult] = useState<{ analysis: Analysis; signature: string; generatedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasProfile = audienceFields.some(({ key }) => profile[key].trim())
  const signature = JSON.stringify({ profile, latest, posts })
  const analysis = result?.signature === signature ? result.analysis : null
  const generate = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      await ensureDemoSession()
      const { data, error: requestError } = await supabase.functions.invoke('instagram-audience-analysis', { body: { accountId: account.id, profile, audience: latest } })
      if (requestError) {
        const details = 'context' in requestError && requestError.context instanceof Response ? await requestError.context.json().catch(() => null) : null
        throw new Error(details?.error || 'No se ha podido realizar el análisis. Comprueba la configuración e inténtalo de nuevo.')
      }
      if (data?.error) throw new Error(data.error)
      if (!data?.analysis) throw new Error('El análisis no ha devuelto un resultado válido.')
      setResult({ analysis: data.analysis as Analysis, signature, generatedAt: new Date().toISOString() })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido realizar el análisis.') }
    finally { setLoading(false) }
  }
  return <section className="aud-ai" aria-labelledby="aud-ai-title"><div className="aud-ai__head"><div><p className="aud-kicker">03 / INTELIGENCIA ESTRATÉGICA</p><h2 id="aud-ai-title">Conecta los puntos con IA <span aria-hidden="true">✦</span></h2><p>Compara tu perfil estratégico con las estadísticas registradas y descubre próximos pasos basados en la información disponible.</p></div><button className="aud-button aud-button--pink" type="button" disabled={loading || !hasProfile || !latest || account.source !== 'instagram'} onClick={() => void generate()}>{loading ? 'Analizando audiencia…' : analysis ? 'Actualizar análisis con IA' : '✦  Analizar audiencia con IA'}</button></div>
    <p className="aud-ai__note">Al analizar, el perfil definido, el último registro manual y las métricas de hasta 40 publicaciones sincronizadas se envían a Gemini. No se envían contraseñas ni tokens.</p>
    {(!hasProfile || !latest || account.source !== 'instagram') && <p className="aud-ai__notice">{account.source !== 'instagram' ? 'Selecciona una cuenta de Instagram conectada.' : !hasProfile ? 'Define primero tu audiencia deseada.' : 'Añade al menos un registro manual de audiencia para comparar.'}</p>}
    {loading && <div className="aud-ai__loading" role="status"><span className="aud-spinner" aria-hidden="true" /> Analizando los datos disponibles; esto puede tardar unos segundos.</div>}
    {error && <p className="aud-error" role="alert">{error}</p>}
    {analysis && result && <div className="aud-ai__result" aria-live="polite"><div className="aud-ai__summary"><span>LECTURA ESTRATÉGICA · {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(result.generatedAt))}</span><h3>{analysis.summary}</h3><p>{analysis.limitations}</p></div><div className="aud-ai__columns"><article><h3>Coincidencias</h3>{analysis.matches.length ? <ul>{analysis.matches.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No hay datos comparables suficientes.</p>}</article><article><h3>Diferencias</h3>{analysis.differences.length ? <ul>{analysis.differences.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No hay diferencias verificables con los datos disponibles.</p>}</article><article><h3>Segmentos y estrategia</h3><p>{analysis.activeSegments}</p><p>{analysis.strategy}</p></article></div><div className="aud-ai__recommendations"><h3>Próximos pasos</h3>{analysis.recommendations.map((item, i) => <div key={i}><span>{item.priority}</span><div><strong>{item.action}</strong><p>{item.reason}</p></div></div>)}</div><p className="aud-footnote">Interpretación orientativa: contrasta las recomendaciones con más datos antes de tomar decisiones.</p></div>}
  </section>
}

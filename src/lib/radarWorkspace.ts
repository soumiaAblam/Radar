import { useCallback, useEffect, useState } from 'react'
import type { RadarAccount } from '../context/AccountContext'
import { ensureDemoSession, supabase } from './supabase'
import type { RadarOpportunity } from './radarAnalytics'

export type RadarSource = 'user' | 'radar' | 'ai' | 'general'
export type RadarPriority = 'alta' | 'media' | 'baja'
export type RadarAction = { id: string; account_id: string; title: string; description: string; category: string; priority: RadarPriority; due_on: string; status: 'pending' | 'done' | 'discarded'; source: RadarSource; source_key: string | null; evidence: string; metric: string; experiment_id: string | null; recurrence: 'none' | 'daily' | 'weekly'; series_id: string | null; completed_at: string | null; created_at: string; updated_at: string }
export type RadarExperiment = { id: string; account_id: string; title: string; hypothesis: string; rationale: string; evidence: string; action: string; metric: string; starts_on: string | null; review_on: string | null; status: 'proposed' | 'planned' | 'running' | 'evaluation' | 'completed' | 'discarded'; source: RadarSource; source_key: string | null; priority: RadarPriority; observed_result: string; conclusion: string; outcome: 'supported' | 'inconclusive' | 'not_supported' | null; publication_id: string | null; created_at: string; updated_at: string }
export type RadarActivity = { id: number; kind: string; description: string; item_id: string | null; happened_at: string }
export const todayKey = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
export function useRadarClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer) }, [])
  return now
}
export const sourceLabel: Record<RadarSource, string> = { user: 'Creada por ti', radar: 'Regla de Radar', ai: 'Análisis IA', general: 'Buena práctica' }
export function opportunitySeed(o: RadarOpportunity, index: number, hasData: boolean) {
  const hasEvidence = hasData && o.evidence !== 'Tema pendiente de clasificar' && o.evidence !== 'Horario pendiente de registrar' && o.evidence !== 'Sin datos suficientes'
  return { title: `Explorar: ${o.title}`, action: o.insight, metric: ['Visualizaciones', 'Guardados', 'Engagement'][index] || '', evidence: o.evidence, source: (hasEvidence ? 'radar' : 'general') as RadarSource, source_key: `opportunity-experiment:${index}` }
}

export function useRadarWorkspace(account: RadarAccount) {
  const [actions, setActions] = useState<RadarAction[]>([])
  const [experiments, setExperiments] = useState<RadarExperiment[]>([])
  const [activity, setActivity] = useState<RadarActivity[]>([])
  const [loading, setLoading] = useState(account.source === 'instagram')
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (account.source !== 'instagram') return
    await ensureDemoSession()
    const [a, e, h] = await Promise.all([
      supabase.from('radar_actions').select('*').eq('account_id', account.id).order('due_on', { ascending: true }),
      supabase.from('radar_experiments').select('*').eq('account_id', account.id).order('created_at', { ascending: false }),
      supabase.from('radar_activity').select('id,kind,description,item_id,happened_at').eq('account_id', account.id).order('happened_at', { ascending: false }).limit(1000),
    ])
    if (a.error || e.error || h.error) throw a.error || e.error || h.error
    setActions((a.data ?? []) as RadarAction[]); setExperiments((e.data ?? []) as RadarExperiment[]); setActivity((h.data ?? []) as RadarActivity[]); setAvailable(true)
  }, [account.id, account.source])

  useEffect(() => {
    let active = true
    if (account.source !== 'instagram') return () => { active = false }
    void refresh().catch(() => { if (active) setError('No se pudo cargar el espacio de trabajo. Comprueba la conexión y que la migración de Radar esté instalada en Supabase.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [account.id, account.source, refresh])

  const mutate = async (work: () => PromiseLike<{ error: { code?: string; message?: string } | null }>, success: string) => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      await ensureDemoSession()
      const result = await work()
      if (result.error) throw result.error
      try { await refresh() } catch { setError('El cambio se guardó, pero no se pudo actualizar la vista. Recarga la página.') }
      setNotice(success); return true
    } catch (cause) {
      const code = (cause as { code?: string })?.code
      setError(code === '23505' ? 'Esta recomendación ya está en tu plan o fue descartada; no se duplicará.' : 'No se pudo guardar el cambio. Comprueba la conexión y los permisos de la cuenta.')
      return false
    } finally { setBusy(false) }
  }
  const addAction = (draft: Partial<RadarAction>) => mutate(() => supabase.from('radar_actions').insert({ ...draft, account_id: account.id }), 'Acción añadida al plan.')
  const updateAction = (id: string, patch: Partial<RadarAction>) => mutate(() => supabase.from('radar_actions').update({ ...patch, updated_at: new Date().toISOString() }).eq('account_id', account.id).eq('id', id).select('id').single(), 'Acción actualizada.')
  const addExperiment = (draft: Partial<RadarExperiment>) => mutate(() => supabase.from('radar_experiments').insert({ ...draft, account_id: account.id }), 'Experimento guardado.')
  const updateExperiment = (id: string, patch: Partial<RadarExperiment>) => mutate(() => supabase.from('radar_experiments').update({ ...patch, updated_at: new Date().toISOString() }).eq('account_id', account.id).eq('id', id).select('id').single(), 'Experimento actualizado.')
  return { actions, experiments, activity, loading, available, error, notice, busy, addAction, updateAction, addExperiment, updateExperiment }
}

import { useEffect, useMemo, useState } from 'react'
import DataCollection from '../../components/DataCollection/DataCollection'
import DashboardGoals from '../../components/DashboardGoals/DashboardGoals'
import DashboardPerformance from '../../components/DashboardPerformance/DashboardPerformance'
import Header from '../../components/Header/Header'
import Sidebar from '../../components/Sidebar/Sidebar'
import WeeklyDiagnosis from '../../components/WeeklyDiagnosis/WeeklyDiagnosis'
import WeeklyPlan from '../../components/WeeklyPlan/WeeklyPlan'
import { useAccount } from '../../context/AccountContext'
import type { DashboardPost } from '../../lib/dashboardAnalytics'
import { loadDailyMetrics, saveDailyMetrics } from '../../lib/metricsStorage'
import { loadPublicationRecords } from '../../lib/publicationStorage'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import { createSummaryAnalysis } from '../../lib/summaryAnalytics'
import type { DailyMetrics } from '../../types/metrics'
import './dashboard.css'
import './dashboard-premium.css'

type ImportedPost = { id: string; title: string | null; caption: string | null; published_at: string | null; media_type: string; views: number | null; likes: number | null; comments: number | null; saves: number | null; shares: number | null; media_url?: string | null; thumbnail_url?: string | null }

function localPosts(accountId: string): DashboardPost[] {
  return loadPublicationRecords(accountId).map((post) => ({
    id: post.id, title: post.title, publishedAt: post.date ? `${post.date}T${post.time || '12:00'}:00` : null,
    format: post.format, views: post.views, likes: post.likes, comments: post.comments,
    saves: post.saves, shares: post.shares, thumbnail: null, source: 'manual',
  }))
}

function DashboardPage() {
  const { selectedAccount } = useAccount()
  const [dailyRecords, setDailyRecords] = useState<DailyMetrics[]>(() => loadDailyMetrics(selectedAccount.id))
  const [posts, setPosts] = useState<DashboardPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const analysis = useMemo(() => createSummaryAnalysis(dailyRecords), [dailyRecords])

  useEffect(() => {
    let active = true
    let loadVersion = 0
    setDailyRecords(loadDailyMetrics(selectedAccount.id))
    setPosts([])
    const load = async () => {
      const version = ++loadVersion
      const manual = localPosts(selectedAccount.id)
      setError('')
      if (selectedAccount.source === 'demo') { setPosts(manual); setLoading(false); return }
      setLoading(true)
      try {
        await ensureDemoSession()
        const base = 'id,title,caption,published_at,media_type,views,likes,comments,saves,shares'
        const result = await supabase.from('media_metrics').select(`${base},media_url,thumbnail_url`).eq('account_id', selectedAccount.id).order('published_at', { ascending: false })
        let data: ImportedPost[]
        if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204')) {
          const legacy = await supabase.from('media_metrics').select(base).eq('account_id', selectedAccount.id).order('published_at', { ascending: false })
          if (legacy.error) throw legacy.error
          data = (legacy.data ?? []) as unknown as ImportedPost[]
        } else {
          if (result.error) throw result.error
          data = (result.data ?? []) as unknown as ImportedPost[]
        }
        const imported: DashboardPost[] = data.map((post) => ({
          id: post.id, title: post.title || post.caption?.split('\n')[0] || 'Publicación de Instagram',
          publishedAt: post.published_at, format: post.media_type, views: post.views, likes: post.likes,
          comments: post.comments, saves: post.saves, shares: post.shares,
          thumbnail: post.thumbnail_url || (post.media_type !== 'reel' ? post.media_url : null) || null, source: 'instagram',
        }))
        if (active && version === loadVersion) {
          const byId = new Map([...manual, ...imported].map((post) => [post.id, post]))
          setPosts([...byId.values()])
        }
      } catch {
        if (active && version === loadVersion) { setPosts(manual); setError('Comprueba la conexión e inténtalo de nuevo.') }
      } finally { if (active && version === loadVersion) setLoading(false) }
    }
    void load()
    const onSync = (event: Event) => {
      if ((event as CustomEvent<{ accountId: string }>).detail?.accountId === selectedAccount.id) void load()
    }
    window.addEventListener('radar:sync-complete', onSync)
    return () => { active = false; window.removeEventListener('radar:sync-complete', onSync) }
  }, [selectedAccount.id, selectedAccount.source])

  const saveRecord = (metrics: DailyMetrics) => {
    setDailyRecords((records) => {
      const next = [...records.filter((record) => record.date !== metrics.date), metrics].sort((a, b) => a.date.localeCompare(b.date))
      saveDailyMetrics(selectedAccount.id, next)
      return next
    })
  }

  return <div className="dashboard-layout"><Sidebar /><div className="dashboard-shell"><Header title="Resumen" showPeriod={false} /><main className="dashboard-content summary-page premium-summary">
    <DashboardPerformance posts={posts} daily={dailyRecords} loading={loading} error={error} handle={selectedAccount.handle} />
    <DashboardGoals key={selectedAccount.id} accountId={selectedAccount.id} />
    <details className="premium-manual"><summary><span>＋</span> Registrar métricas manuales <small>Seguidores, alcance y otros datos</small></summary><DataCollection records={dailyRecords} onSave={saveRecord} /></details>
    <details className="premium-manual"><summary><span>✦</span> Diagnóstico y plan semanal <small>Consulta el análisis anterior</small></summary><div className="premium-legacy"><WeeklyDiagnosis recordCount={dailyRecords.length} analysis={analysis} /><WeeklyPlan records={dailyRecords} /></div></details>
    <footer className="premium-summary__footer"><span>RETORIKA <strong>RADAR</strong></span><span>Un paso más cerca de crecer. ✦</span></footer>
  </main></div></div>
}

export default DashboardPage

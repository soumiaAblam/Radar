import { useEffect, useState } from 'react'
import Header from '../../components/Header/Header'
import AiRadarDiagnosis from '../../components/AiRadarDiagnosis/AiRadarDiagnosis'
import RadarExperimentPlan from '../../components/RadarExperimentPlan/RadarExperimentPlan'
import RadarOpportunities from '../../components/RadarOpportunities/RadarOpportunities'
import RadarOverview from '../../components/RadarOverview/RadarOverview'
import Sidebar from '../../components/Sidebar/Sidebar'
import { useAccount } from '../../context/AccountContext'
import { createRadarInsights } from '../../lib/radarAnalytics'
import { loadPublicationRecords } from '../../lib/publicationStorage'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { PublicationRecord } from '../../types/publication'
import './Radar.css'

function RadarPage() {
  const { selectedAccount } = useAccount()
  const [records, setRecords] = useState<PublicationRecord[]>(() => loadPublicationRecords(selectedAccount.id))

  useEffect(() => {
    let isCurrentAccount = true
    const localRecords = loadPublicationRecords(selectedAccount.id)
    if (selectedAccount.source === 'demo') {
      setRecords(localRecords)
      return () => { isCurrentAccount = false }
    }

    const loadImportedRecords = async () => {
      try {
        await ensureDemoSession()
        const { data, error } = await supabase
          .from('media_metrics')
          .select('id, title, caption, published_at, published_time, media_type, views, likes, comments, saves, shares')
          .eq('account_id', selectedAccount.id)
          .order('published_at', { ascending: false })
        if (error) throw error

        const importedRecords: PublicationRecord[] = (data ?? []).map((record) => {
          const publishedAt = record.published_at ? new Date(record.published_at) : null
          const views = record.views ?? 0
          const likes = record.likes ?? 0
          const comments = record.comments ?? 0
          const saves = record.saves ?? 0
          const shares = record.shares ?? 0
          return {
            id: record.id,
            title: record.title || record.caption?.split('\n')[0] || 'Publicación de Instagram',
            date: publishedAt?.toISOString().slice(0, 10) ?? '',
            time: record.published_time?.slice(0, 5) ?? publishedAt?.toISOString().slice(11, 16) ?? '',
            format: record.media_type,
            topic: 'Instagram',
            views,
            likes,
            comments,
            saves,
            shares,
            engagement: views > 0 ? ((likes + comments + saves + shares) / views) * 100 : 0,
          }
        })
        if (isCurrentAccount) setRecords([...importedRecords, ...localRecords])
      } catch {
        if (isCurrentAccount) setRecords(localRecords)
      }
    }

    void loadImportedRecords()
    return () => { isCurrentAccount = false }
  }, [selectedAccount.id, selectedAccount.source])

  const insights = createRadarInsights(records)
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-shell">
        <Header title="Radar" />
        <main className="dashboard-content radar-page">
          <RadarOverview account={selectedAccount} records={records} />
          <AiRadarDiagnosis account={selectedAccount} recordsCount={records.length} />
          <RadarOpportunities opportunities={insights.opportunities} />
          <RadarExperimentPlan experiments={insights.experiments} />
        </main>
      </div>
    </div>
  )
}

export default RadarPage

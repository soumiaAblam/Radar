import { useEffect, useMemo, useState } from 'react'
import PublicationDataCollection from '../../components/PublicationDataCollection/PublicationDataCollection'
import Header from '../../components/Header/Header'
import PublicationFilters from '../../components/PublicationFilters/PublicationFilters'
import PublicationInsights from '../../components/PublicationInsights/PublicationInsights'
import PublicationLibrary from '../../components/PublicationLibrary/PublicationLibrary'
import PublicationMetricGrid from '../../components/PublicationMetricGrid/PublicationMetricGrid'
import PublicationRankings from '../../components/PublicationRankings/PublicationRankings'
import Sidebar from '../../components/Sidebar/Sidebar'
import { createPublicationRecord, filterAndSortPublications } from '../../lib/publicationAnalytics'
import { loadPublicationRecords, savePublicationRecords } from '../../lib/publicationStorage'
import type { PublicationFiltersState, PublicationRecordInput } from '../../types/publication'
import { useAccount } from '../../context/AccountContext'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import type { PublicationRecord } from '../../types/publication'
import './Publication.css'

function PublicationPage() {
  const { selectedAccount } = useAccount()
  const [records, setRecords] = useState(() => loadPublicationRecords(selectedAccount.id))
  const [filters, setFilters] = useState<PublicationFiltersState>({ format: 'all', period: 'all', topic: 'all', sort: 'recent' })
  const filteredRecords = useMemo(() => filterAndSortPublications(records, filters), [records, filters])

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
  }, [selectedAccount.id])

  const saveRecord = (publication: PublicationRecordInput) => {
    setRecords((currentRecords) => {
      const nextRecords = [...currentRecords, createPublicationRecord(publication)].sort((first, second) => first.date.localeCompare(second.date))
      savePublicationRecords(selectedAccount.id, nextRecords)
      return nextRecords
    })
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-shell">
        <Header title="Publicaciones" />
        <main className="dashboard-content publication-page">
          <section className="dashboard-intro" aria-labelledby="publication-title">
            <p className="section-kicker">PUBLICACIONES</p>
            <h1 id="publication-title">Analiza qué funciona y qué publicar ahora.</h1>
            <p>Consulta el rendimiento de tu contenido, compara formatos y prepara decisiones basadas en datos.</p>
          </section>
          <PublicationDataCollection records={records} onSave={saveRecord} />
          <PublicationMetricGrid records={filteredRecords} />
          <PublicationFilters filters={filters} records={records} onChange={setFilters} />
          <PublicationLibrary records={filteredRecords} />
          <PublicationRankings records={filteredRecords} />
          <PublicationInsights records={filteredRecords} />
        </main>
      </div>
    </div>
  )
}

export default PublicationPage

import { useMemo, useState } from 'react'
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
import './Publication.css'

function PublicationPage() {
  const [records, setRecords] = useState(loadPublicationRecords)
  const [filters, setFilters] = useState<PublicationFiltersState>({ format: 'all', period: 'all', topic: 'all', sort: 'recent' })
  const filteredRecords = useMemo(() => filterAndSortPublications(records, filters), [records, filters])

  const saveRecord = (publication: PublicationRecordInput) => {
    setRecords((currentRecords) => {
      const nextRecords = [...currentRecords, createPublicationRecord(publication)].sort((first, second) => first.date.localeCompare(second.date))
      savePublicationRecords(nextRecords)
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

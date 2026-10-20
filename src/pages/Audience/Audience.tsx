import { useState } from 'react'
import AudienceDataCollection from '../../components/AudienceDataCollection/AudienceDataCollection'
import AudienceOverview from '../../components/AudienceOverview/AudienceOverview'
import Header from '../../components/Header/Header'
import Sidebar from '../../components/Sidebar/Sidebar'
import { loadAudienceMetrics, saveAudienceMetrics } from '../../lib/audienceStorage'
import type { AudienceMetrics } from '../../types/audience'
import './Audience.css'

function AudiencePage() {
  const [records, setRecords] = useState<AudienceMetrics[]>(loadAudienceMetrics)
  const latestRecord = records.at(-1)

  const saveRecord = (metrics: AudienceMetrics) => {
    setRecords((currentRecords) => {
      const nextRecords = [...currentRecords.filter((record) => record.date !== metrics.date), metrics].sort((first, second) => first.date.localeCompare(second.date))
      saveAudienceMetrics(nextRecords)
      return nextRecords
    })
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-shell">
        <Header title="Audiencia" />
        <main className="dashboard-content audience-page">
          <section className="dashboard-intro" aria-labelledby="audience-title">
            <p className="section-kicker">AUDIENCIA</p>
            <h1 id="audience-title">Conoce y haz crecer tu comunidad.</h1>
            <p>Registra las estadísticas de Instagram para entender quién te sigue y tomar mejores decisiones.</p>
          </section>
          <AudienceDataCollection records={records} onSave={saveRecord} />
          <AudienceOverview latestRecord={latestRecord} />
        </main>
      </div>
    </div>
  )
}

export default AudiencePage

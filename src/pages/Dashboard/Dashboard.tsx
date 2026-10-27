import { useEffect, useMemo, useState } from 'react'
import DataCollection from '../../components/DataCollection/DataCollection'
import GrowthOverview from '../../components/GrowthOverview/GrowthOverview'
import Header from '../../components/Header/Header'
import Sidebar from '../../components/Sidebar/Sidebar'
import SummaryInsightCards from '../../components/SummaryInsightCards/SummaryInsightCards'
import WeeklyDiagnosis from '../../components/WeeklyDiagnosis/WeeklyDiagnosis'
import WeeklyPlan from '../../components/WeeklyPlan/WeeklyPlan'
import { createSummaryAnalysis } from '../../lib/summaryAnalytics'
import { loadDailyMetrics, saveDailyMetrics } from '../../lib/metricsStorage'
import type { DailyMetrics } from '../../types/metrics'
import { useAccount } from '../../context/AccountContext'
import './dashboard.css'

function DashboardPage() {
  const { selectedAccount } = useAccount()
  const [dailyRecords, setDailyRecords] = useState<DailyMetrics[]>(() => loadDailyMetrics(selectedAccount.id))
  const analysis = useMemo(() => createSummaryAnalysis(dailyRecords), [dailyRecords])

  useEffect(() => {
    setDailyRecords(loadDailyMetrics(selectedAccount.id))
  }, [selectedAccount.id])

  const saveRecord = (metrics: DailyMetrics) => {
    setDailyRecords((records) => {
      const nextRecords = [...records.filter((record) => record.date !== metrics.date), metrics].sort((first, second) => first.date.localeCompare(second.date))
      saveDailyMetrics(selectedAccount.id, nextRecords)
      return nextRecords
    })
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-shell">
        <Header title="Resumen" />
        <main className="dashboard-content summary-page">
          <section className="dashboard-intro" aria-labelledby="summary-title">
            <p className="section-kicker">RESUMEN</p>
            <h1 id="summary-title">Nuestro diagnóstico y plan de crecimiento.</h1>
            <p>Consulta el estado de la cuenta, identifica qué hacer a continuación y sigue tus objetivos semanales.</p>
          </section>
          <WeeklyDiagnosis recordCount={dailyRecords.length} analysis={analysis} />
          <DataCollection records={dailyRecords} onSave={saveRecord} />
          <SummaryInsightCards analysis={analysis} />
          <div className="summary-page__lower-grid">
            <WeeklyPlan records={dailyRecords} />
            <GrowthOverview records={dailyRecords} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage

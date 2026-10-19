import AudienceProfile from '../../components/AudienceProfile/AudienceProfile'
import FollowersChart from '../../components/FollowersChart/FollowersChart'
import Header from '../../components/Header/Header'
import InsightsPanel from '../../components/InsightsPanel/InsightsPanel'
import MetricGrid from '../../components/MetricGrid/MetricGrid'
import Sidebar from '../../components/Sidebar/Sidebar'
import './dashboard.css'

function DashboardPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-shell">
        <Header title="Audiencia" />

        <main className="dashboard-content">
          <section className="dashboard-intro" aria-labelledby="dashboard-title">
            <p className="section-kicker">AUDIENCIA</p>
            <h1 id="dashboard-title">Conoce y haz crecer tu comunidad.</h1>
            <p>Analiza quién te sigue, cómo evoluciona tu audiencia y detecta oportunidades reales de crecimiento.</p>
          </section>

          <MetricGrid />

          <div className="dashboard-columns">
            <div className="dashboard-primary">
              <AudienceProfile />
              <FollowersChart />
            </div>
            <InsightsPanel />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage

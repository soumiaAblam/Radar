import AudienceProfile from '../AudienceProfile/AudienceProfile'
import FollowersChart from '../FollowersChart/FollowersChart'
import Header from '../Header/Header'
import InsightsPanel from '../InsightsPanel/InsightsPanel'
import MetricGrid from '../MetricGrid/MetricGrid'
import Sidebar from '../Sidebar/Sidebar'
import './analytics-layout.css'

type AnalyticsLayoutProps = {
  section: string
  title: string
  description: string
}

function AnalyticsLayout({ section, title, description }: AnalyticsLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-shell">
        <Header title={section} />
        <main className="dashboard-content">
          <section className="dashboard-intro" aria-labelledby="page-title">
            <p className="section-kicker">{section}</p>
            <h1 id="page-title">{title}</h1>
            <p>{description}</p>
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

export default AnalyticsLayout

import './insights-panel.css'

function InsightsPanel() {
  return (
    <aside className="insights-panel" aria-label="Tarjetas vacías de información">
      <div className="panel dashboard-empty-card dashboard-empty-card--insight" />
      <div className="panel dashboard-empty-card dashboard-empty-card--recommendation" />
    </aside>
  )
}

export default InsightsPanel

import './metric-grid.css'

function MetricGrid() {
  return (
    <section className="metric-grid" aria-label="Tarjetas vacías de indicadores">
      {Array.from({ length: 5 }, (_, index) => <div className="metric-card dashboard-empty-card" key={index} />)}
    </section>
  )
}

export default MetricGrid

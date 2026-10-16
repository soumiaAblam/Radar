import './sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <strong>RETORIKA RADAR</strong>

      <ul className="sidebar_nav">
        <li><a href="/inicio">Dashboard</a></li>
        <li><a href="/audiencias">Audiencias</a></li>
        <li><a href="/publicaciones">Publicaciones</a></li>
        <li><a href="/radar">Radar</a></li>
      </ul>
    </aside>
  )
}

export default Sidebar

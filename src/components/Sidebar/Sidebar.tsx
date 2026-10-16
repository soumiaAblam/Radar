import './sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <strong>RETORIKA RADAR</strong>

      <ul className="sidebarMenu">
        <li><a className="active" href="/inicio">Dashboard</a></li>
        <li><a  href="/audiencias">Audiencias</a></li>
        <li><a  href="/publicaciones">Publicaciones</a></li>
        <li><a  href="/radar">Radar</a></li>
      </ul>
    </aside>
  )
}

export default Sidebar

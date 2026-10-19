import './sidebar.css'

const navigationItems = [
  { icon: '⌂', label: 'Resumen', href: '/Dashboard' },
  { icon: '◉', label: 'Audiencia', href: '/Dashboard', active: true },
  { icon: '▣', label: 'Publicaciones', href: '/publicaciones' },
  { icon: '◇', label: 'Radar', href: '/radar' },
]

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <a className="sidebar-brand" href="/Dashboard" aria-label="Retorika Radar, ir al inicio">
        <strong>RETORIKA</strong>
        <span>RADAR</span>
      </a>

      <nav>
        <ul className="sidebar-menu">
          {navigationItems.map((item) => (
            <li key={item.label}>
              <a className={item.active ? 'sidebar-link sidebar-link--active' : 'sidebar-link'} href={item.href}>
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <a className="sidebar-settings" href="#settings"><span aria-hidden="true">⚙</span> Ajustes</a>
    </aside>
  )
}

export default Sidebar

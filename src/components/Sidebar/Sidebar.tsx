import './sidebar.css'
import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const navigationItems = [
  { icon: 'summary', label: 'Resumen', href: '/Dashboard' },
  { icon: 'audience', label: 'Audiencia', href: '/audiencia' },
  { icon: 'publication', label: 'Publicaciones', href: '/publicaciones' },
  { icon: 'content', label: 'Gestión de contenidos', href: '/gestion-de-contenidos' },
  { icon: 'radar', label: 'Radar', href: '/radar' },
]

type NavigationIconName = typeof navigationItems[number]['icon']

function NavigationIcon({ name }: { name: NavigationIconName }) {
  if (name === 'summary') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  if (name === 'audience') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.2" /><path d="M3.5 20c.7-3.4 2.65-5.2 5.5-5.2s4.8 1.8 5.5 5.2M15.3 15.2c2.55.1 4.2 1.7 4.7 4.8" /></svg>
  if (name === 'publication') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
  if (name === 'content') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
}

function Sidebar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSettingsOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setIsSettingsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSettingsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSettingsOpen])

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
              <NavLink className={({ isActive }) => isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'} to={item.href}>
                <NavigationIcon name={item.icon} />{item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-settings-wrap" ref={settingsRef}>
        {isSettingsOpen && (
          <section className="settings-menu" aria-label="Menú de ajustes">
            <button type="button" className="settings-menu__close" aria-label="Cerrar ajustes" onClick={() => setIsSettingsOpen(false)}>×</button>
            <div className="settings-menu__group settings-menu__group--first">
              <button type="button">Ajustes lingüísticos</button>
              <button type="button">Ajustes de apariencia</button>
              <button type="button">Ajustes de fuentes</button>
            </div>
            <div className="settings-menu__group">
              <button type="button">Ajustes de privacidad</button>
            </div>
            <div className="settings-menu__group settings-menu__group--danger">
              <button type="button">Desactivar cuenta</button>
              <button type="button">Eliminar cuenta</button>
            </div>
          </section>
        )}
        <button type="button" className="sidebar-settings" aria-expanded={isSettingsOpen} onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
          Ajustes
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

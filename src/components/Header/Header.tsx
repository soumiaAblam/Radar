import './header.css'

interface HeaderProps { title: string }

function Header({ title }: HeaderProps) {
  return (
    <header className="app-header">
      <p className="app-header__context">{title}</p>
      <div className="account-selector"><span aria-hidden="true">◎</span> @retorika_Academy <span aria-hidden="true">⌄</span></div>
      <div className="app-header__actions">
        <button type="button" className="period-button">▣ Últimos 30 días <span aria-hidden="true">⌄</span></button>
        <button type="button" className="icon-button" aria-label="Notificaciones">♧</button>
        <span className="profile-avatar" aria-label="Perfil de demostración">R</span>
      </div>
    </header>
  )
}

export default Header

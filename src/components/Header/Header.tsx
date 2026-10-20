import { useState, type FormEvent } from 'react'
import './header.css'

interface HeaderProps { title: string }

type OpenPanel = 'accounts' | 'add-account' | 'notifications' | 'profile' | null

type LinkedAccount = {
  id: string
  handle: string
}

const initialAccounts: LinkedAccount[] = [
  { id: 'retorika-academy', handle: 'retorika_Academy' },
  { id: 'retorika-media', handle: 'retorika_media' },
  { id: 'retorika-lab', handle: 'retorika_lab' },
]

function Header({ title }: HeaderProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [linkedAccounts, setLinkedAccounts] = useState(initialAccounts)
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0].id)
  const [instagramHandle, setInstagramHandle] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')

  const selectedAccount = linkedAccounts.find((account) => account.id === selectedAccountId) ?? linkedAccounts[0]

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((currentPanel) => currentPanel === panel ? null : panel)
  }

  const closePanel = () => setOpenPanel(null)

  const requestAccountLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanHandle = instagramHandle.trim().replace(/^@+/, '')

    if (!cleanHandle) {
      setConnectionMessage('Escribe el nombre de usuario de Instagram para continuar.')
      return
    }

    const existingAccount = linkedAccounts.find((account) => account.handle.toLowerCase() === cleanHandle.toLowerCase())
    if (existingAccount) {
      setSelectedAccountId(existingAccount.id)
      setConnectionMessage(`@${cleanHandle} ya está vinculada a esta cuenta.`)
      return
    }

    const newAccount = { id: `instagram-${Date.now()}`, handle: cleanHandle }
    setLinkedAccounts((accounts) => [...accounts, newAccount])
    setSelectedAccountId(newAccount.id)
    setInstagramHandle('')
    setConnectionMessage(`@${cleanHandle} se ha vinculado en modo demostración y ya aparece en tu lista.`)
  }

  return (
    <header className="app-header">
      <p className="app-header__context">{title}</p>

      <div className="header-account-actions">
        <div className="header-popover">
          <button type="button" className="account-selector" aria-expanded={openPanel === 'accounts'} onClick={() => togglePanel('accounts')}>
            <span className="account-selector__platform" aria-hidden="true">◎</span>
            @{selectedAccount.handle}
            <span aria-hidden="true">⌄</span>
          </button>
          {openPanel === 'accounts' && (
            <section className="header-panel account-panel" aria-label="Cuentas vinculadas">
              <div className="header-panel__title"><h2>Cuentas vinculadas</h2><button type="button" aria-label="Cerrar cuentas vinculadas" onClick={closePanel}>×</button></div>
              <div className="account-list">
                {linkedAccounts.map((account) => (
                  <button type="button" className={account.id === selectedAccountId ? 'account-list__item account-list__item--selected' : 'account-list__item'} key={account.id} onClick={() => setSelectedAccountId(account.id)}>
                    <span aria-hidden="true">◎</span>@{account.handle}<b aria-hidden="true">{account.id === selectedAccountId ? '✓' : ''}</b>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="header-popover">
          <button type="button" className="account-add-button" aria-expanded={openPanel === 'add-account'} onClick={() => togglePanel('add-account')}>
            <span aria-hidden="true">+</span> Añadir nueva cuenta
          </button>
          {openPanel === 'add-account' && (
            <section className="header-panel add-account-panel" aria-label="Añadir cuenta de Instagram">
              <div className="header-panel__title"><h2>Añadir cuenta</h2><button type="button" aria-label="Cerrar añadir cuenta" onClick={closePanel}>×</button></div>
              <p className="add-account-panel__description">Escribe la cuenta de Instagram que quieres vincular.</p>
              <form className="add-account-form" onSubmit={requestAccountLink}>
                <label htmlFor="instagram-handle">Cuenta de Instagram</label>
                <div><span aria-hidden="true">@</span><input id="instagram-handle" value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} placeholder="nombre_de_usuario" autoComplete="off" /></div>
                <button type="submit">Solicitar vinculación</button>
              </form>
              {connectionMessage && <p className="add-account-panel__message" role="status">{connectionMessage}</p>}
              <p className="add-account-panel__note">En la versión conectada, este paso abrirá la autorización oficial de Instagram.</p>
            </section>
          )}
        </div>
      </div>

      <div className="app-header__actions">
        <button type="button" className="period-button">▣ Últimos 30 días <span aria-hidden="true">⌄</span></button>
        <div className="header-popover">
          <button type="button" className="icon-button" aria-label="Notificaciones" aria-expanded={openPanel === 'notifications'} onClick={() => togglePanel('notifications')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
          </button>
          {openPanel === 'notifications' && (
            <section className="header-panel notification-panel" aria-label="Notificaciones">
              <div className="header-panel__title">
                <h2>Notificaciones</h2>
                <button type="button" aria-label="Cerrar notificaciones" onClick={closePanel}>×</button>
              </div>
              <p>No tienes nuevas notificaciones.</p>
            </section>
          )}
        </div>
        <div className="header-popover">
          <button type="button" className="profile-avatar" aria-label="Abrir perfil" aria-expanded={openPanel === 'profile'} onClick={() => togglePanel('profile')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.85-3.25 3.05-5 6.5-5s5.65 1.75 6.5 5" /></svg>
          </button>
          {openPanel === 'profile' && (
            <section className="header-panel profile-panel" aria-label="Perfil de usuario">
              <button type="button" className="header-panel__close" aria-label="Cerrar perfil" onClick={closePanel}>×</button>
              <div className="profile-panel__photo" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.85-3.25 3.05-5 6.5-5s5.65 1.75 6.5 5" /></svg></div>
              <strong>Usuario demo</strong>
              <span>demo@demo.com</span>
              <div className="profile-panel__actions">
                <button type="button">Editar cuenta</button>
                <button type="button" className="profile-panel__logout">Cerrar sesión</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

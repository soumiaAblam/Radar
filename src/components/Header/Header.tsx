import { useEffect, useState, type FormEvent } from 'react'
import './header.css'
import { ensureDemoSession, supabase } from '../../lib/supabase'
import { useAccount } from '../../context/AccountContext'

interface HeaderProps { title: string }

type OpenPanel = 'accounts' | 'add-account' | 'notifications' | 'profile' | 'edit-profile' | null

type ProfileDetails = {
  name: string
  email: string
}

async function readableFunctionError(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context
  if (context) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) return payload.error
    } catch {
      // Conservamos el mensaje seguro por defecto si la respuesta no es JSON.
    }
  }
  if (error instanceof Error && error.message && !error.message.includes('Failed to send a request to the Edge Function')) return error.message
  return fallback
}

function Header({ title }: HeaderProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const { accounts, selectedAccount, selectAccount, refreshAccounts } = useAccount()
  const [connectionMessage, setConnectionMessage] = useState('')
  const [connectingLevel, setConnectingLevel] = useState<'basic' | 'advanced' | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
  const [profile, setProfile] = useState<ProfileDetails>({ name: 'Usuario demo', email: 'demo@demo.com' })
  const [profileDraft, setProfileDraft] = useState<ProfileDetails>(profile)
  const [newPassword, setNewPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search)
    const instagramStatus = parameters.get('instagram')

    if (instagramStatus === 'connected') {
      setConnectionMessage('Cuenta de Instagram vinculada correctamente. Ya puedes sincronizar sus publicaciones.')
      void refreshAccounts()
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (instagramStatus === 'error') {
      setConnectionMessage('No se ha podido completar la vinculación. Vuelve a intentarlo desde Añadir nueva cuenta.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((currentPanel) => currentPanel === panel ? null : panel)
  }

  const closePanel = () => setOpenPanel(null)

  const openProfileEditor = () => {
    setProfileDraft(profile)
    setNewPassword('')
    setProfileMessage('')
    setOpenPanel('edit-profile')
  }

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfile({
      name: profileDraft.name.trim() || profile.name,
      email: profileDraft.email.trim() || profile.email,
    })
    setNewPassword('')
    setProfileMessage('Perfil actualizado en esta sesión de demostración.')
  }

  const signOut = () => {
    window.location.assign('/')
  }

  const requestAccountLink = async (level: 'basic' | 'advanced') => {
    setConnectionMessage('')
    setConnectingLevel(level)

    try {
      await ensureDemoSession()
      const functionName = level === 'basic' ? 'instagram-direct-oauth-start' : 'instagram-oauth-start'
      const { data, error } = await supabase.functions.invoke(functionName)

      if (error || !data?.authorizationUrl) {
        throw error ?? new Error('No se ha recibido la URL de autorización de Instagram.')
      }

      window.location.assign(data.authorizationUrl as string)
    } catch (error) {
      const fallback = level === 'basic'
        ? 'La conexión básica de Instagram aún no está activada. Configura Instagram Login y vuelve a intentarlo.'
        : 'No se ha podido iniciar la conexión avanzada con Meta. Vuelve a intentarlo.'
      setConnectionMessage(await readableFunctionError(error, fallback))
      setConnectingLevel(null)
    }
  }

  const synchronizeSelectedAccount = async () => {
    if (!selectedAccount || selectedAccount.source !== 'instagram') return

    setConnectionMessage('')
    setIsSynchronizing(true)

    try {
      await ensureDemoSession()
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { accountId: selectedAccount.id },
      })

      if (error) throw error
      setConnectionMessage(`Sincronización completada: ${data.imported ?? 0} publicaciones importadas.`)
    } catch {
      setConnectionMessage('No se han podido sincronizar las publicaciones. Comprueba la conexión de Meta e inténtalo de nuevo.')
    } finally {
      setIsSynchronizing(false)
    }
  }

  return (
    <>
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
                {accounts.map((account) => (
                  <button
                    type="button"
                    className={account.id === selectedAccount.id ? 'account-list__item account-list__item--selected' : 'account-list__item'}
                    key={account.id}
                    onClick={() => {
                      selectAccount(account.id)
                      closePanel()
                    }}
                  >
                    <span className="account-list__platform" aria-hidden="true">◎</span>
                    <span className="account-list__handle">@{account.handle}{account.source === 'demo' && <small>Cuenta demo</small>}{account.level === 'basic' && <small>Cuenta básica</small>}{account.level === 'advanced' && <small>Análisis avanzado</small>}</span>
                    <b aria-hidden="true">{account.id === selectedAccount.id ? '✓' : ''}</b>
                  </button>
                ))}
              </div>
              {selectedAccount?.source === 'instagram' && (
                <button type="button" className="account-sync-button" onClick={() => void synchronizeSelectedAccount()} disabled={isSynchronizing}>
                  {isSynchronizing ? 'Sincronizando…' : selectedAccount.level === 'basic' ? 'Sincronizar publicaciones básicas' : 'Sincronizar métricas y publicaciones'}
                </button>
              )}
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
              <p className="add-account-panel__description">Elige el nivel que mejor encaja con tu cuenta profesional de Instagram.</p>
              <div className="connection-levels">
                <article className="connection-level connection-level--basic">
                  <div className="connection-level__heading"><strong>Cuenta básica</strong><span>SOLO INSTAGRAM</span></div>
                  <p>Conecta sin Facebook para ver tu perfil, publicaciones, Me gusta y comentarios.</p>
                  <small>No incluye alcance, impresiones ni análisis con IA.</small>
                  <button type="button" className="instagram-connect-button instagram-connect-button--secondary" onClick={() => void requestAccountLink('basic')} disabled={connectingLevel !== null}>
                    {connectingLevel === 'basic' ? 'Abriendo Instagram…' : 'Conectar cuenta básica'}
                  </button>
                </article>
                <article className="connection-level connection-level--advanced">
                  <div className="connection-level__heading"><strong>Cuenta avanzada</strong><span>ANÁLISIS IA</span></div>
                  <p>Conecta mediante Meta/Facebook una cuenta profesional vinculada a una Página.</p>
                  <small>Incluye métricas, alcance, publicaciones y análisis estratégico con IA.</small>
                  <button type="button" className="instagram-connect-button" onClick={() => void requestAccountLink('advanced')} disabled={connectingLevel !== null}>
                    {connectingLevel === 'advanced' ? 'Abriendo Meta…' : 'Activar análisis avanzado'}
                  </button>
                </article>
              </div>
              {connectionMessage && <p className="add-account-panel__message" role="status">{connectionMessage}</p>}
              <p className="add-account-panel__note">Ambos niveles admiten solo cuentas profesionales de Instagram: Business o Creator. RADAR nunca recibe tu contraseña.</p>
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
              <strong>{profile.name}</strong>
              <span>{profile.email}</span>
              <div className="profile-panel__actions">
                <button type="button" onClick={openProfileEditor}>Editar cuenta</button>
                <button type="button" className="profile-panel__logout" onClick={signOut}>Cerrar sesión</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </header>
    {openPanel === 'edit-profile' && (
      <section className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
        <div className="profile-edit-modal__card">
          <button type="button" className="profile-edit-modal__close" aria-label="Cerrar edición de perfil" onClick={closePanel}>×</button>
          <p>PERFIL</p>
          <h2 id="profile-edit-title">Editar perfil</h2>
          <span>Actualiza los datos visibles de tu cuenta.</span>
          <form onSubmit={saveProfile}>
            <label>Nombre<input type="text" value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} autoComplete="name" required /></label>
            <label>Email<input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required /></label>
            <label>Nueva contraseña<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Dejar en blanco para no cambiarla" autoComplete="new-password" minLength={6} /></label>
            <div className="profile-edit-modal__actions"><button type="button" onClick={closePanel}>Cancelar</button><button type="submit">Guardar cambios</button></div>
          </form>
          {profileMessage && <strong className="profile-edit-modal__message" role="status">{profileMessage}</strong>}
        </div>
      </section>
    )}
    </>
  )
}

export default Header

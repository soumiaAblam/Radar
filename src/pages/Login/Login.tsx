import { useState } from 'react'
import type { FormEvent } from 'react'
import './Login.css'
import './palette.css'
import { useNavigate } from 'react-router-dom'
import { ensureDemoSession } from '../../lib/supabase'

const demoAccount = {
  email: 'demo@demo.com',
  password: 'demo123',
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !password) {
      setMessage('Completa tu correo y contraseña para continuar.')
      return
    }

    if (email.trim().toLowerCase() !== demoAccount.email || password !== demoAccount.password) {
      setMessage('Los datos no coinciden. Usa la cuenta de demostración indicada.')
      return
    }

    try {
      await ensureDemoSession()
    } catch {
      // El acceso visual demo se conserva si Supabase todavía no tiene activado
      // el acceso anónimo. La vinculación de Instagram avisará cómo activarlo.
    }

    navigate('/Dashboard')
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-labelledby="brand-title">
        <div className="brand-panel__content">
          <a className="brand" href="#access-form" aria-label="Retorika Radar, ir al acceso">
            <span>RETORIKA RADAR</span>
          </a>
          <div className="brand-panel__copy">
            <p className="eyebrow">ANALÍTICA PARA CRECER CON CRITERIO</p>
            <h1 id="brand-title">Tus redes, con una mirada más clara.</h1>
            <p>Convierte datos de Instagram en decisiones de contenido que impulsan tu comunidad.</p>
          </div>
          <div className="analysis-orbit" aria-hidden="true">
            <span className="analysis-orbit__ring analysis-orbit__ring--outer" />
            <span className="analysis-orbit__ring analysis-orbit__ring--inner" />
            <span className="analysis-orbit__dot" />
            <span className="analysis-orbit__value">78<small>%</small></span>
          </div>
          <div className="insight-card" aria-label="Vista previa de análisis">
            <div className="insight-card__header"><span>Rendimiento semanal</span></div>
            <div className="insight-card__metric"><strong>+18,4%</strong><span>interacción</span></div>
            <div className="mini-chart" aria-hidden="true"><span className="bar bar--one" /><span className="bar bar--two" /><span className="bar bar--three" /><span className="bar bar--four" /><span className="bar bar--five" /><span className="bar bar--six" /><i /></div>
          </div>
        </div>
        <p className="brand-panel__footer">© 2026 Retorika Academy</p>
      </section>

      <section className="access-panel" aria-labelledby="access-title">
        <div className="access-panel__content">
          <div className="mobile-brand" aria-label="Retorika Radar">RETORIKA RADAR</div>
          <header>
            <p className="eyebrow">RETORIKA RADAR</p>
            <h2 id="access-title">Bienvenida de nuevo</h2>
            <p className="access-panel__intro">Accede a tu espacio de análisis y crecimiento.</p>
            <p className="demo-access">Cuenta demo: <strong>demo@demo.com</strong> · Contraseña: <strong>demo123</strong></p>
          </header>

          {/* El envío del formulario ejecuta handleSubmit y valida el acceso. */}

          <form id="access-form" className="access-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Correo profesional</label>
            <input id="email" type="email" autoComplete="email" placeholder="tu@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div className="label-row">
              <label htmlFor="password">Contraseña</label>
              <button className="text-button" type="button" onClick={() => setMessage('La recuperación de acceso estará disponible con el backend.')}>¿La has olvidado?</button>
            </div>
            <div className="password-field">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Introduce tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((currentValue) => !currentValue)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            <button className="primary-button" type="submit">Entrar en Radar</button>
            {message && <p className="form-message" role="status">{message}</p>}
          </form>
          <div className="access-panel__divider"><span>o</span></div>
          <p className="request-access">¿Aún no tienes acceso? <button type="button" className="text-button" onClick={() => setMessage('La solicitud de acceso estará disponible próximamente.')}>Solicítalo aquí</button></p>
        </div>
      </section>
    </main>
    
  )
}

export default LoginPage

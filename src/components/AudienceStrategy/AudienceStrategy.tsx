import { useState, type FormEvent } from 'react'
import { audienceFields, type AudienceProfile } from '../../lib/audienceStrategy'

type Props = { profile: AudienceProfile; onSave: (profile: AudienceProfile) => void }

export default function AudienceStrategy({ profile, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [message, setMessage] = useState('')
  const filled = audienceFields.filter(({ key }) => profile[key].trim())
  const save = (event: FormEvent) => {
    event.preventDefault()
    try { onSave(draft); setEditing(false); setMessage('Perfil guardado en este navegador.') }
    catch { setMessage('No se ha podido guardar el perfil en este navegador.') }
  }
  return <section className="aud-card aud-target" aria-labelledby="aud-target-title">
    <div className="aud-section-head"><div><p className="aud-kicker aud-kicker--pink">01 / EL PERFIL ESTRATÉGICO</p><h2 id="aud-target-title">Audiencia deseada</h2><p>Las personas a las que Retorika quiere llegar. Define tu punto de partida y actualízalo cuando lo necesites.</p></div>
      {!editing && <button className="aud-button aud-button--outline" type="button" onClick={() => { setDraft(profile); setMessage(''); setEditing(true) }}>{filled.length ? '✎  Editar perfil' : '+  Definir perfil'}</button>}</div>
    {editing ? <form className="aud-profile-form" onSubmit={save}>
      {audienceFields.map(({ key, label, placeholder }) => <label key={key}>{label}<textarea rows={2} maxLength={500} placeholder={placeholder} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <div className="aud-form-actions"><button className="aud-button" type="submit">Guardar perfil</button><button className="aud-button aud-button--outline" type="button" onClick={() => setEditing(false)}>Cancelar</button></div>
    </form> : filled.length ? <div className="aud-profile-grid">{audienceFields.map(({ key, label }) => <div key={key}><span>{label}</span><strong>{profile[key] || 'Sin definir'}</strong></div>)}</div> : <div className="aud-empty aud-empty--pink"><span aria-hidden="true">✦</span><div><strong>Tu perfil estratégico empieza aquí</strong><p>Añade edad, ubicación, intereses y necesidades para poder contrastarlos con los datos reales disponibles.</p></div></div>}
    <p className="aud-footnote" role="status">{message || 'El perfil se guarda por cuenta en este navegador.'}</p>
  </section>
}

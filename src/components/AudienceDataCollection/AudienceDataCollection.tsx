import { useState, type FormEvent } from 'react'
import type { AudienceMetrics } from '../../types/audience'
import './audience-data-collection.css'

type AudienceDataCollectionProps = {
  records: AudienceMetrics[]
  onSave: (metrics: AudienceMetrics) => void
}

const emptyAudienceMetrics: AudienceMetrics = {
  date: new Date().toISOString().slice(0, 10),
  totalFollowers: 0,
  newFollowers: 0,
  lostFollowers: 0,
  womenPercentage: 0,
  menPercentage: 0,
  topAgeRange: '',
  topCountry: '',
  topCity: '',
  peakDay: '',
  peakTime: '',
}

function AudienceDataCollection({ records, onSave }: AudienceDataCollectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [metrics, setMetrics] = useState<AudienceMetrics>(emptyAudienceMetrics)
  const [message, setMessage] = useState('')

  const saveMetrics = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(metrics)
    setMessage(`Datos de audiencia del ${metrics.date} guardados en este navegador.`)
  }

  return (
    <section className="audience-data-collection" aria-labelledby="audience-data-title">
      <header>
        <div><p>FUENTE DE DATOS</p><h2 id="audience-data-title">Registra los datos de tu audiencia</h2></div>
        <span>{records.length} registros</span>
      </header>
      <div className="audience-data-collection__sources">
        <article><b>Instagram</b><span>Sin sincronizar</span><p>La información demográfica llegará automáticamente al conectar Meta.</p></article>
        <article><b>Registro manual</b><span>{records.length ? 'En uso' : 'Disponible'}</span><p>Introduce los datos que ves en las estadísticas de tu cuenta.</p></article>
      </div>
      <button type="button" className="audience-data-collection__toggle" aria-expanded={isFormOpen} onClick={() => setIsFormOpen((isOpen) => !isOpen)}>
        {isFormOpen ? 'Ocultar registro manual' : '+ Añadir datos de audiencia'}
      </button>
      {isFormOpen && (
        <form className="audience-data-collection__form" onSubmit={saveMetrics}>
          <label>Fecha<input type="date" value={metrics.date} onChange={(event) => setMetrics((current) => ({ ...current, date: event.target.value }))} required /></label>
          <div className="audience-data-collection__fields">
            <label>Seguidores actuales<input type="number" min="0" value={metrics.totalFollowers} onChange={(event) => setMetrics((current) => ({ ...current, totalFollowers: Number(event.target.value) }))} required /></label>
            <label>Nuevos seguidores<input type="number" min="0" value={metrics.newFollowers} onChange={(event) => setMetrics((current) => ({ ...current, newFollowers: Number(event.target.value) }))} required /></label>
            <label>Bajas<input type="number" min="0" value={metrics.lostFollowers} onChange={(event) => setMetrics((current) => ({ ...current, lostFollowers: Number(event.target.value) }))} required /></label>
            <label>Mujeres (%)<input type="number" min="0" max="100" value={metrics.womenPercentage} onChange={(event) => setMetrics((current) => ({ ...current, womenPercentage: Number(event.target.value) }))} required /></label>
            <label>Hombres (%)<input type="number" min="0" max="100" value={metrics.menPercentage} onChange={(event) => setMetrics((current) => ({ ...current, menPercentage: Number(event.target.value) }))} required /></label>
            <label>Edad principal<input type="text" value={metrics.topAgeRange} onChange={(event) => setMetrics((current) => ({ ...current, topAgeRange: event.target.value }))} placeholder="Por ejemplo: 25–34" required /></label>
            <label>País principal<input type="text" value={metrics.topCountry} onChange={(event) => setMetrics((current) => ({ ...current, topCountry: event.target.value }))} placeholder="Por ejemplo: España" required /></label>
            <label>Ciudad principal<input type="text" value={metrics.topCity} onChange={(event) => setMetrics((current) => ({ ...current, topCity: event.target.value }))} placeholder="Por ejemplo: Madrid" required /></label>
            <label>Día de mayor actividad<input type="text" value={metrics.peakDay} onChange={(event) => setMetrics((current) => ({ ...current, peakDay: event.target.value }))} placeholder="Por ejemplo: Miércoles" required /></label>
            <label>Hora de mayor actividad<input type="text" value={metrics.peakTime} onChange={(event) => setMetrics((current) => ({ ...current, peakTime: event.target.value }))} placeholder="Por ejemplo: 19:00–21:00" required /></label>
          </div>
          <button type="submit">Guardar datos de audiencia</button>
        </form>
      )}
      {message && <p className="audience-data-collection__message" role="status">{message}</p>}
    </section>
  )
}

export default AudienceDataCollection

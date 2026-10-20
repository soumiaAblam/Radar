import { useState, type FormEvent } from 'react'
import type { DailyMetrics } from '../../types/metrics'
import './data-collection.css'

type DataCollectionProps = {
  records: DailyMetrics[]
  onSave: (metrics: DailyMetrics) => void
}

const fields: Array<{ key: Exclude<keyof DailyMetrics, 'date'>; label: string }> = [
  { key: 'followers', label: 'Seguidores' },
  { key: 'reach', label: 'Alcance' },
  { key: 'views', label: 'Visualizaciones' },
  { key: 'likes', label: 'Likes' },
  { key: 'saves', label: 'Guardados' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'publications', label: 'Publicaciones' },
  { key: 'reels', label: 'Reels' },
  { key: 'carousels', label: 'Carruseles' },
  { key: 'stories', label: 'Historias' },
]

const emptyMetrics: DailyMetrics = {
  date: new Date().toISOString().slice(0, 10), followers: 0, reach: 0, views: 0, likes: 0, saves: 0, shares: 0, publications: 0, reels: 0, carousels: 0, stories: 0,
}

function DataCollection({ records, onSave }: DataCollectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [metrics, setMetrics] = useState<DailyMetrics>(emptyMetrics)
  const [message, setMessage] = useState('')

  const saveMetrics = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(metrics)
    setMessage(`Registro de ${metrics.date} guardado en este navegador.`)
    setMetrics({ ...emptyMetrics, date: metrics.date })
  }

  return (
    <section className="data-collection" aria-labelledby="data-collection-title">
      <header>
        <div><p>FUENTES DE DATOS</p><h2 id="data-collection-title">Prepara los datos de tu cuenta</h2></div>
        <span>{records.length} registros</span>
      </header>
      <div className="data-collection__sources">
        <article><div><b>Instagram</b><span>Sin sincronizar</span></div><p>La conexión automática se activará con la autorización oficial de Meta.</p></article>
        <article><div><b>Datos manuales</b><span>{records.length ? 'En uso' : 'Disponible'}</span></div><p>Introduce las métricas que no lleguen automáticamente desde Instagram.</p></article>
      </div>
      <button type="button" className="data-collection__toggle" onClick={() => setIsFormOpen((isOpen) => !isOpen)} aria-expanded={isFormOpen}>{isFormOpen ? 'Ocultar registro manual' : '+ Registrar métricas manualmente'}</button>
      {isFormOpen && (
        <form className="data-collection__form" onSubmit={saveMetrics}>
          <label>Fecha<input type="date" value={metrics.date} onChange={(event) => setMetrics((current) => ({ ...current, date: event.target.value }))} required /></label>
          <div className="data-collection__fields">
            {fields.map((field) => <label key={field.key}>{field.label}<input type="number" min="0" value={metrics[field.key]} onChange={(event) => setMetrics((current) => ({ ...current, [field.key]: Number(event.target.value) }))} required /></label>)}
          </div>
          <button type="submit">Guardar métricas del día</button>
        </form>
      )}
      {message && <p className="data-collection__message" role="status">{message} Se sincronizará con Supabase cuando la migración y la autenticación estén activas.</p>}
    </section>
  )
}

export default DataCollection

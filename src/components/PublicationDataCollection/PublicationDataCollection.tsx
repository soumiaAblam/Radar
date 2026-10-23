import { useState, type FormEvent } from 'react'
import type { PublicationFormat, PublicationRecord, PublicationRecordInput } from '../../types/publication'
import './publication-data-collection.css'

type PublicationDataCollectionProps = {
  records: PublicationRecord[]
  onSave: (publication: PublicationRecordInput) => void
}

const emptyPublication: PublicationRecordInput = {
  title: '', date: new Date().toISOString().slice(0, 10), time: '', format: 'reel', topic: '', views: 0, likes: 0, comments: 0, saves: 0, shares: 0,
}

function PublicationDataCollection({ records, onSave }: PublicationDataCollectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [publication, setPublication] = useState<PublicationRecordInput>(emptyPublication)
  const [message, setMessage] = useState('')

  const savePublication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(publication)
    setMessage(`“${publication.title}” se ha guardado en este navegador.`)
    setPublication({ ...emptyPublication, date: publication.date })
  }

  return (
    <section className="publication-data-collection" aria-labelledby="publication-data-title">
      <header><div><p>FUENTE DE DATOS</p><h2 id="publication-data-title">Registra una publicación</h2></div><span>{records.length} publicaciones</span></header>
      <div className="publication-data-collection__sources"><article><b>Instagram</b><span>Sin sincronizar</span><p>La importación automática se activará al conectar Meta.</p></article><article><b>Datos manuales</b><span>{records.length ? 'En uso' : 'Disponible'}</span><p>Guarda las métricas de cada publicación desde las estadísticas de Instagram.</p></article></div>
      <button type="button" className="publication-data-collection__toggle" aria-expanded={isFormOpen} onClick={() => setIsFormOpen((isOpen) => !isOpen)}>{isFormOpen ? 'Ocultar formulario' : '+ Añadir publicación manualmente'}</button>
      {isFormOpen && (
        <form className="publication-data-collection__form" onSubmit={savePublication}>
          <div className="publication-data-collection__fields publication-data-collection__fields--main">
            <label>Título<input type="text" value={publication.title} onChange={(event) => setPublication((current) => ({ ...current, title: event.target.value }))} placeholder="Título de la publicación" required /></label>
            <label>Fecha<input type="date" value={publication.date} onChange={(event) => setPublication((current) => ({ ...current, date: event.target.value }))} required /></label>
            <label>Hora de publicación<input type="time" value={publication.time} onChange={(event) => setPublication((current) => ({ ...current, time: event.target.value }))} /></label>
            <label>Formato<select value={publication.format} onChange={(event) => setPublication((current) => ({ ...current, format: event.target.value as PublicationFormat }))}><option value="reel">Reel</option><option value="carousel">Carrusel</option><option value="image">Imagen</option><option value="story">Historia</option></select></label>
            <label>Tema<input type="text" value={publication.topic} onChange={(event) => setPublication((current) => ({ ...current, topic: event.target.value }))} placeholder="Por ejemplo: Liderazgo" required /></label>
          </div>
          <div className="publication-data-collection__fields">
            <label>Visualizaciones<input type="number" min="0" value={publication.views} onChange={(event) => setPublication((current) => ({ ...current, views: Number(event.target.value) }))} required /></label>
            <label>Likes<input type="number" min="0" value={publication.likes} onChange={(event) => setPublication((current) => ({ ...current, likes: Number(event.target.value) }))} required /></label>
            <label>Comentarios<input type="number" min="0" value={publication.comments} onChange={(event) => setPublication((current) => ({ ...current, comments: Number(event.target.value) }))} required /></label>
            <label>Guardados<input type="number" min="0" value={publication.saves} onChange={(event) => setPublication((current) => ({ ...current, saves: Number(event.target.value) }))} required /></label>
            <label>Compartidos<input type="number" min="0" value={publication.shares} onChange={(event) => setPublication((current) => ({ ...current, shares: Number(event.target.value) }))} required /></label>
          </div>
          <button type="submit">Guardar publicación</button>
        </form>
      )}
      {message && <p className="publication-data-collection__message" role="status">{message}</p>}
    </section>
  )
}

export default PublicationDataCollection

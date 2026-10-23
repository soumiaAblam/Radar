import type { PublicationFiltersState, PublicationRecord } from '../../types/publication'
import './publication-filters.css'

const formats: Array<{ label: string, value: PublicationFiltersState['format'] }> = [{ label: 'Todas', value: 'all' }, { label: 'Reels', value: 'reel' }, { label: 'Carruseles', value: 'carousel' }, { label: 'Imágenes', value: 'image' }, { label: 'Historias', value: 'story' }]

type PublicationFiltersProps = { filters: PublicationFiltersState, records: PublicationRecord[], onChange: (filters: PublicationFiltersState) => void }

function PublicationFilters({ filters, records, onChange }: PublicationFiltersProps) {
  const topics = [...new Set(records.map((record) => record.topic).filter(Boolean))]

  return (
    <section className="publication-filters" aria-label="Filtros de publicaciones">
      <div className="publication-filters__formats">
        {formats.map((format) => <button type="button" className={format.value === filters.format ? 'publication-filters__format publication-filters__format--active' : 'publication-filters__format'} key={format.value} onClick={() => onChange({ ...filters, format: format.value })}>{format.label}</button>)}
      </div>
      <div className="publication-filters__selects">
        <label>Período<select value={filters.period} onChange={(event) => onChange({ ...filters, period: event.target.value as PublicationFiltersState['period'] })}><option value="all">Todo el historial</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></label>
        <label>Tema<select value={filters.topic} onChange={(event) => onChange({ ...filters, topic: event.target.value })}><option value="all">Todos los temas</option>{topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}</select></label>
        <label>Ordenar por<select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as PublicationFiltersState['sort'] })}><option value="recent">Más recientes</option><option value="views">Más visualizaciones</option><option value="engagement">Mayor engagement</option><option value="saves">Más guardados</option><option value="shares">Más compartidos</option></select></label>
      </div>
    </section>
  )
}

export default PublicationFilters

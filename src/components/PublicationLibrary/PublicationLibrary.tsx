import type { CSSProperties } from 'react'
import type { PublicationRecord } from '../../types/publication'
import './publication-library.css'

type PublicationLibraryProps = { records: PublicationRecord[] }

const mediaIcons: Record<PublicationRecord['format'], string> = {
  reel: '▶',
  carousel: '▦',
  image: '◈',
  story: '◌',
}

function PublicationLibrary({ records }: PublicationLibraryProps) {
  return (
    <section className="publication-library" aria-labelledby="publication-library-title">
      <header><div><p>BIBLIOTECA</p><h2 id="publication-library-title">Tus publicaciones</h2></div><span>{records.length} publicaciones</span></header>
      {!records.length ? <div className="publication-library__empty">
        <strong>Aún no hay publicaciones registradas.</strong>
        <p>Cuando conectes Instagram o añadas publicaciones manualmente, aparecerán aquí para poder analizarlas.</p>
      </div> : <div className="publication-library__grid">{[...records].reverse().map((record, index) => <article className={`publication-library__card publication-library__card--${record.format}`} key={record.id} style={{ '--publication-delay': `${Math.min(index, 7) * 65}ms` } as CSSProperties}>
        <div className="publication-library__visual" aria-hidden="true"><span>{mediaIcons[record.format]}</span><i /><i /><i /></div>
        <span>{record.format}</span><h3>{record.title}</h3><p>{record.topic} · {record.date}</p><div><b>{record.views.toLocaleString('es-ES')} visualizaciones</b><b>{record.engagement.toFixed(1)}% engagement</b></div>
      </article>)}</div>}
    </section>
  )
}

export default PublicationLibrary

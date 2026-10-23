import type { PublicationRecord } from '../../types/publication'
import './publication-rankings.css'

const rankings = [
  { title: 'Mejores reels', detail: 'Ordenados por visualizaciones' },
  { title: 'Mejores carruseles', detail: 'Ordenados por guardados' },
  { title: 'Oportunidades de mejora', detail: 'Publicaciones con menor rendimiento' },
]

type PublicationRankingsProps = { records: PublicationRecord[] }

function PublicationRankings({ records }: PublicationRankingsProps) {
  const getRanking = (format: PublicationRecord['format'], metric: 'views' | 'saves') => records.filter((record) => record.format === format).sort((first, second) => second[metric] - first[metric]).slice(0, 3)
  const reelRanking = getRanking('reel', 'views')
  const carouselRanking = getRanking('carousel', 'saves')
  const lowestRanking = [...records].sort((first, second) => first.engagement - second.engagement).slice(0, 3)
  const recordLists = [reelRanking, carouselRanking, lowestRanking]

  return (
    <section className="publication-rankings" aria-labelledby="publication-rankings-title">
      <header><div><p>RANKINGS</p><h2 id="publication-rankings-title">Rendimiento por formato</h2></div></header>
      <div className="publication-rankings__grid">
        {rankings.map((ranking, index) => <article key={ranking.title}><h3>{ranking.title}</h3><p>{ranking.detail}</p>{recordLists[index].length ? <ol>{recordLists[index].map((record) => <li key={record.id}><span>{record.title}</span><b>{index === 0 ? record.views.toLocaleString('es-ES') : index === 1 ? record.saves.toLocaleString('es-ES') : `${record.engagement.toFixed(1)}%`}</b></li>)}</ol> : <span>Se mostrará al disponer de publicaciones.</span>}</article>)}
      </div>
    </section>
  )
}

export default PublicationRankings

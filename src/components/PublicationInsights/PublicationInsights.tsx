import { getAverageEngagement, getBestTiming, getFormatComparison } from '../../lib/publicationAnalytics'
import type { PublicationRecord } from '../../types/publication'
import './publication-insights.css'

type PublicationInsightsProps = { records: PublicationRecord[] }

function PublicationInsights({ records }: PublicationInsightsProps) {
  const averageEngagement = getAverageEngagement(records)
  const bestPublication = [...records].sort((first, second) => second.engagement - first.engagement)[0]
  const worstPublication = [...records].sort((first, second) => first.engagement - second.engagement)[0]
  const comparisons = getFormatComparison(records)
  const mostViewedFormat = [...comparisons].sort((first, second) => second.averageViews - first.averageViews)[0]
  const mostSavedFormat = [...comparisons].sort((first, second) => second.averageSaves - first.averageSaves)[0]
  const bestTiming = getBestTiming(records)

  return (
    <section className="publication-insights" aria-label="Engagement y diagnóstico de publicaciones">
      <article><p>ENGAGEMENT</p><h2>Rendimiento y horarios</h2><strong>{records.length ? `${averageEngagement.toFixed(1)}% de engagement medio` : '—'}</strong><span>{bestTiming.day ? `Mejor día: ${bestTiming.day}. ${bestTiming.time ? `Mejor hora: ${bestTiming.time}.` : 'Añade horas para completar el análisis.'}` : 'El engagement y las mejores horas aparecerán tras registrar publicaciones con métricas.'}</span></article>
      <article><p>FORMATOS</p><h2>Qué formato funciona</h2><strong>{mostViewedFormat ? `${mostViewedFormat.format === 'reel' ? 'Reels' : mostViewedFormat.format === 'carousel' ? 'Carruseles' : mostViewedFormat.format === 'image' ? 'Imágenes' : 'Historias'} lideran en visualizaciones` : 'Sin datos suficientes'}</strong><span>{mostViewedFormat && mostSavedFormat ? `${mostViewedFormat.averageViews.toFixed(0)} visualizaciones medias. ${mostSavedFormat.format === 'carousel' ? 'Los carruseles' : mostSavedFormat.format === 'reel' ? 'Los reels' : mostSavedFormat.format === 'image' ? 'Las imágenes' : 'Las historias'} generan más guardados.` : 'Compara formatos al registrar publicaciones de cada tipo.'}</span></article>
      <article><p>DIAGNÓSTICO</p><h2>Recomendaciones</h2><strong>{bestPublication ? `Destaca: ${bestPublication.title}` : 'Sin datos suficientes'}</strong><span>{bestPublication && worstPublication ? `Mejor resultado: ${bestPublication.engagement.toFixed(1)}%. Revisa “${worstPublication.title}” (${worstPublication.engagement.toFixed(1)}%) para identificar mejoras.` : 'Necesitamos publicaciones y métricas para detectar qué contenido funciona y qué puedes mejorar.'}</span></article>
    </section>
  )
}

export default PublicationInsights

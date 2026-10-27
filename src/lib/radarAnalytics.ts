import { getBestTiming, getFormatComparison } from './publicationAnalytics'
import type { PublicationRecord } from '../types/publication'

export type RadarOpportunity = {
  title: string
  insight: string
  evidence: string
  tone: 'blue' | 'pink' | 'green'
}

export type RadarExperiment = {
  number: string
  title: string
  description: string
  metric: string
}

function formatLabel(format: PublicationRecord['format']) {
  return { reel: 'reel', carousel: 'carrusel', image: 'imagen', story: 'historia' }[format]
}

function bestTopic(records: PublicationRecord[]) {
  const topics = new Map<string, { saves: number, count: number }>()
  records.filter((record) => record.topic && record.topic !== 'Instagram').forEach((record) => {
    const value = topics.get(record.topic) ?? { saves: 0, count: 0 }
    topics.set(record.topic, { saves: value.saves + record.saves, count: value.count + 1 })
  })
  return [...topics.entries()].sort((first, second) => (second[1].saves / second[1].count) - (first[1].saves / first[1].count))[0]?.[0]
}

export function createRadarInsights(records: PublicationRecord[]) {
  if (!records.length) {
    return {
      opportunities: [
        { title: 'Formato por descubrir', insight: 'Registra publicaciones para comparar qué formato atrae más atención.', evidence: 'Aún no hay publicaciones analizadas', tone: 'blue' },
        { title: 'Tema por validar', insight: 'Los guardados ayudarán a detectar los temas con mayor valor percibido.', evidence: 'Aún no hay temas comparables', tone: 'pink' },
        { title: 'Horario por aprender', insight: 'Con fecha y hora de publicación identificaremos el mejor momento para publicar.', evidence: 'Aún no hay horarios comparables', tone: 'green' },
      ] as RadarOpportunity[],
      experiments: [
        { number: '01', title: 'Registra tus próximas publicaciones', description: 'Añade formato, tema y métricas para activar recomendaciones personalizadas.', metric: 'Meta: 3 publicaciones con métricas' },
        { number: '02', title: 'Prueba dos formatos', description: 'Compara un reel y un carrusel sobre un tema similar.', metric: 'Métrica: visualizaciones y guardados' },
        { number: '03', title: 'Publica en dos horarios', description: 'Anota la hora de cada publicación para que Radar pueda encontrar patrones.', metric: 'Métrica: engagement' },
      ] as RadarExperiment[],
    }
  }

  const format = getFormatComparison(records).sort((first, second) => second.averageViews - first.averageViews)[0]
  const topic = bestTopic(records)
  const timing = getBestTiming(records)
  const topPublication = [...records].sort((first, second) => second.engagement - first.engagement)[0]
  const opportunities: RadarOpportunity[] = [
    {
      title: 'Formato con más alcance',
      insight: format ? `Los ${formatLabel(format.format)} generan una media de ${Math.round(format.averageViews).toLocaleString('es-ES')} visualizaciones.` : 'Aún no hay formatos comparables.',
      evidence: format ? `${format.count} publicación${format.count === 1 ? '' : 'es'} analizada${format.count === 1 ? '' : 's'}` : 'Sin datos suficientes',
      tone: 'blue',
    },
    {
      title: 'Contenido para guardar',
      insight: topic ? `El tema “${topic}” obtiene más guardados por publicación.` : 'Añade temas a las publicaciones manuales para detectar contenido de valor.',
      evidence: topic ? 'Basado en guardados medios' : 'Tema pendiente de clasificar',
      tone: 'pink',
    },
    {
      title: 'Mejor momento detectado',
      insight: timing.day || timing.time ? `La mejor señal actual es ${timing.day ?? 'un día por confirmar'}${timing.time ? ` a las ${timing.time}` : ''}.` : 'Necesitamos fecha y hora para detectar el mejor momento.',
      evidence: timing.day || timing.time ? 'Basado en engagement medio' : 'Horario pendiente de registrar',
      tone: 'green',
    },
  ]

  const formatName = format ? formatLabel(format.format) : 'formato que mejor funcione'
  const experiments: RadarExperiment[] = [
    {
      number: '01',
      title: `Repite un ${formatName}`,
      description: format ? `Publica un nuevo ${formatName} y conserva el enfoque que mejor alcance ha generado.` : 'Publica dos formatos distintos sobre el mismo tema para compararlos.',
      metric: 'Métrica: visualizaciones',
    },
    {
      number: '02',
      title: topic ? `Desarrolla “${topic}”` : 'Añade un tema a cada publicación',
      description: topic ? 'Convierte ese tema en una pieza guardable: guía, lista o pasos prácticos.' : 'Clasificar los temas permite detectar qué contenido conviene repetir.',
      metric: 'Métrica: guardados',
    },
    {
      number: '03',
      title: timing.time ? `Prueba las ${timing.time}` : 'Prueba un horario constante',
      description: timing.time ? `Programa la publicación cerca de las ${timing.time} y compara el resultado con tu media.` : 'Registra la hora de las próximas publicaciones para medir el mejor momento.',
      metric: topPublication ? `Referencia: ${topPublication.engagement.toFixed(1)} % de engagement` : 'Métrica: engagement',
    },
  ]

  return { opportunities, experiments }
}

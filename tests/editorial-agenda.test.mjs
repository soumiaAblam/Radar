import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('src/lib/editorialAgenda.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
const exports = {}
new Function('require', 'exports', compiled.outputText)((name) => {
  if (name !== './contentManagement') throw new Error('Dependencia inesperada')
  return { dayKey: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
}, exports)

test('determina el día según la zona horaria de la cuenta', () => {
  const instant = new Date('2026-11-25T23:30:00Z')
  assert.equal(exports.dayInTimeZone(instant, 'Europe/Madrid'), '2026-11-26')
  assert.equal(exports.dayInTimeZone(instant, 'America/Mexico_City'), '2026-11-25')
})

test('muestra solo vídeos planificados de hoy o de fechas futuras ordenados por fecha y hora', () => {
  const items = [
    { id: 'future', title: 'Mañana', status: 'scheduled', scheduled_date: '2026-11-26', scheduled_time: '09:00', media_kind: 'video' },
    { id: 'later', title: 'Hoy tarde', status: 'scheduled', scheduled_date: '2026-11-25', scheduled_time: '17:00', media_kind: 'video' },
    { id: 'early', title: 'Hoy temprano', status: 'scheduled', scheduled_date: '2026-11-25', scheduled_time: '08:00', media_kind: 'video' },
    { id: 'past', title: 'Ayer', status: 'scheduled', scheduled_date: '2026-11-24', scheduled_time: '09:00', media_kind: 'video' },
    { id: 'published', title: 'Publicado', status: 'published', scheduled_date: '2026-11-25', scheduled_time: '09:00', media_kind: 'video' },
    { id: 'image', title: 'Imagen', status: 'scheduled', scheduled_date: '2026-11-25', scheduled_time: '09:00', media_kind: 'image' },
  ]
  assert.deepEqual(exports.scheduledVideos(items, '2026-11-25', 'today').map((item) => item.id), ['early', 'later'])
  assert.deepEqual(exports.scheduledVideos(items, '2026-11-25', 'upcoming').map((item) => item.id), ['early', 'later', 'future'])
})

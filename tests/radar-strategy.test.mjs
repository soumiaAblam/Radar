import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function loadTypescript(path, dependencies = {}) {
  const source = readFileSync(path, 'utf8')
  const compiled = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } })
  assert.equal(compiled.diagnostics?.length, 0)
  const module = { exports: {} }
  new Function('require', 'exports', 'module', compiled.outputText)((name) => {
    if (!(name in dependencies)) throw new Error(`Dependencia inesperada: ${name}`)
    return dependencies[name]
  }, module.exports, module)
  return module.exports
}

const publication = loadTypescript('src/lib/publicationAnalytics.ts')
const { createRadarInsights } = loadTypescript('src/lib/radarAnalytics.ts', { './publicationAnalytics': publication })
const { opportunitySeed } = loadTypescript('src/lib/radarWorkspace.ts', { react: React, './supabase': {} })
const makeRecord = (overrides = {}) => ({ id: '1', title: 'Publicación', date: '2026-11-16', time: '10:00', format: 'reel', topic: 'Instagram', views: 100, likes: 8, comments: 1, saves: 2, shares: 1, engagement: 12, ...overrides })

test('sin publicaciones se muestran tres oportunidades y tres pruebas iniciales', () => {
  const result = createRadarInsights([])
  assert.equal(result.opportunities.length, 3)
  assert.equal(result.experiments.length, 3)
  assert.match(result.opportunities[0].evidence, /no hay publicaciones/i)
})

test('la regla usa visualizaciones reales y no inventa un tema de Instagram', () => {
  const result = createRadarInsights([makeRecord()])
  assert.match(result.opportunities[0].insight, /100 visualizaciones/)
  assert.match(result.opportunities[0].evidence, /1 publicación/)
  assert.match(result.opportunities[1].evidence, /pendiente de clasificar/i)
})

test('los temas clasificados se comparan por guardados medios', () => {
  const result = createRadarInsights([makeRecord({ topic: 'Oratoria', saves: 12 }), makeRecord({ id: '2', topic: 'Narrativa', saves: 2 })])
  assert.match(result.opportunities[1].insight, /Oratoria/)
})

test('una oportunidad sin clasificación se identifica como buena práctica', () => {
  const result = createRadarInsights([makeRecord()])
  assert.equal(opportunitySeed(result.opportunities[0], 0, true).source, 'radar')
  assert.equal(opportunitySeed(result.opportunities[1], 1, true).source, 'general')
})

test('la migración protege acciones, experimentos e historial y evita duplicados', () => {
  const sql = readFileSync('supabase/migrations/20261116_radar_strategy.sql', 'utf8')
  for (const table of ['radar_actions', 'radar_experiments', 'radar_activity']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
  assert.match(sql, /unique \(account_id, series_id, due_on\)/i)
  assert.match(sql, /radar_actions_source_unique/i)
  assert.match(sql, /on conflict \(account_id,series_id,due_on\) do nothing/i)
  assert.match(sql, /a\.id = account_id and a\.user_id = auth\.uid\(\)/i)
})

test('Hoy distingue el espacio no disponible de un plan con cero tareas', () => {
  const fixed = new Date('2026-11-16T12:00:00')
  const { default: Today } = loadTypescript('src/components/RadarWorkspace/RadarToday.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: React,
    '../../lib/radarWorkspace': { todayKey: () => '2026-11-16', useRadarClock: () => fixed },
    './RadarActions': { __esModule: true, default: () => null },
  })
  const workspace = { actions: [], experiments: [], activity: [], loading: false, available: false, busy: false }
  const html = renderToStaticMarkup(React.createElement(Today, { account: { handle: 'retorika', source: 'instagram', level: 'advanced' }, recordsCount: 0, workspace, opportunities: createRadarInsights([]).opportunities, disabled: true, onTab() {}, onOpportunity() {} }))
  assert.match(html, /Plan no disponible/)
  assert.doesNotMatch(html, /0 pendientes/)
  assert.doesNotMatch(html, /aria-valuenow/)
  assert.match(html, /FUENTE NO CONECTADA/)
})

test('Hoy calcula el avance solo con el plan actual y presenta tendencias sin inventar', () => {
  const fixed = new Date('2026-11-16T12:00:00')
  const { default: Today } = loadTypescript('src/components/RadarWorkspace/RadarToday.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: React,
    '../../lib/radarWorkspace': { todayKey: () => '2026-11-16', useRadarClock: () => fixed, sourceLabel: { user: 'Creada por ti' } },
    './RadarActions': { __esModule: true, default: () => React.createElement('div', null, 'Tu plan de hoy') },
  })
  const workspace = { actions: [
    { id: '1', title: 'Preparar un reel', status: 'pending', due_on: '2026-11-16', priority: 'media', source: 'user' },
    { id: '2', title: 'Acción futura', status: 'pending', due_on: '2026-11-20', priority: 'alta', source: 'user' },
    { id: '3', title: 'Acción completada', status: 'done', due_on: '2026-11-16', completed_at: '2026-11-16T10:00:00Z' },
  ], experiments: [], activity: [], loading: false, available: true, busy: false }
  const html = renderToStaticMarkup(React.createElement(Today, { account: { source: 'instagram', connectionStatus: 'connected' }, recordsCount: 5, workspace, opportunities: [], disabled: false, onTab() {}, onOpportunity() {} }))
  assert.match(html, /aria-valuenow="50"/)
  assert.match(html, /1 de 2 acciones completadas/)
  assert.match(html, /Tu plan de hoy/)
  assert.match(html, /FUENTE NO CONECTADA/)
  assert.match(html, /Vídeos/)
  assert.match(html, /Hashtags/)
})

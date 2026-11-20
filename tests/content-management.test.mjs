import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('src/lib/contentManagement.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
const module = { exports: {} }
new Function('exports', 'module', compiled.outputText)(module.exports, module)
const { parseDriveUrl, parseDriveFolder, editorialWarnings, defaultSettings } = module.exports
const item = (patch = {}) => ({ id: 'one', event_id: 'event-a', status: 'scheduled', scheduled_date: '2026-11-20', scheduled_time: '10:00', topics: ['Oratoria'], ...patch })

test('valida enlaces de archivos Drive sin aceptar dominios o protocolos falsos', () => {
  assert.deepEqual(parseDriveUrl('https://drive.google.com/file/d/abc-123/view'), { valid: true, id: 'abc-123' })
  assert.deepEqual(parseDriveUrl('https://drive.google.com/open?id=abc_123'), { valid: true, id: 'abc_123' })
  assert.equal(parseDriveUrl('').valid, true)
  for (const url of ['javascript:alert(1)', 'https://drive.google.com.evil.example/file/d/a/view', 'https://drive.google.com/drive/folders/abc', 'http://drive.google.com/file/d/abc/view']) assert.equal(parseDriveUrl(url).valid, false)
})

test('acepta enlaces de carpeta compartida y conserva su clave de recurso', () => {
  assert.deepEqual(parseDriveFolder('https://drive.google.com/drive/folders/abc-123?usp=sharing&resourcekey=0-Secret_123'), { id:'abc-123', resourceKey:'0-Secret_123' })
  assert.deepEqual(parseDriveFolder('https://drive.google.com/drive/u/0/folders/abc?resourceKey=abc_1'), { id:'abc', resourceKey:'abc_1' })
  assert.deepEqual(parseDriveFolder('abc-123'), { id:'abc-123', resourceKey:null })
  for (const input of ['https://drive.google.com.evil.example/drive/folders/abc', 'https://drive.google.com/file/d/abc/view', 'https://drive.google.com/drive/folders/abc?resourcekey=%0D%0A', 'https://drive.google.com/drive/folders/abc?resourcekey=a&resourcekey=b']) assert.equal(parseDriveFolder(input), null)
})

test('avisa si el evento es igual al contenido anterior o siguiente', () => {
  const current = item()
  assert.match(editorialWarnings(current, [item({ id: 'before', scheduled_date: '2026-11-19' })], defaultSettings).join(' '), /consecutivas del mismo evento/)
  assert.match(editorialWarnings(current, [item({ id: 'after', scheduled_date: '2026-11-21' })], defaultSettings).join(' '), /consecutivas del mismo evento/)
  assert.doesNotMatch(editorialWarnings(current, [item({ id: 'other', event_id: 'event-b', topics: [] })], defaultSettings).join(' '), /mismo evento/)
})

test('detecta simultaneidad, temática y separación configurables sin comparar el registro consigo mismo', () => {
  const current = item()
  const warnings = editorialWarnings(current, [current, item({ id: 'two' })], { ...defaultSettings, min_event_days: 2 })
  assert.equal(warnings.length, 5)
  assert.match(warnings.join(' '), /misma hora/)
  assert.deepEqual(editorialWarnings(current, [current], defaultSettings), [])
  assert.deepEqual(editorialWarnings({ ...current, scheduled_date: null }, [item({ id: 'two' })], defaultSettings), [])
  assert.deepEqual(editorialWarnings(current, [item({ id: 'draft', status: 'editing' })], defaultSettings), [])
})

test('la migración restringe datos por propietario y evita duplicados por cuenta', () => {
  const sql = readFileSync('supabase/migrations/20261119_content_management.sql', 'utf8')
  for (const table of ['content_events', 'editorial_content', 'content_editorial_settings']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
  assert.match(sql, /a\.id = account_id and a\.user_id = auth\.uid\(\)/i)
  assert.match(sql, /unique index editorial_content_drive_unique on public\.editorial_content\(account_id, drive_file_id\)/i)
  assert.match(sql, /foreign key \(event_id, account_id\)/i)
  assert.match(sql, /scheduled_needs_datetime/i)
})

test('los ejemplos de demostración no utilizan Supabase ni enlaces de archivos reales', () => {
  const demo = readFileSync('src/pages/ContentManagement/ContentDemo.tsx', 'utf8')
  assert.match(demo, /ejemplos de demostración/)
  assert.match(demo, /no se guardan en tu biblioteca/)
  assert.doesNotMatch(demo, /supabase|drive\.google\.com/i)
  assert.match(demo, /setItems/)
})

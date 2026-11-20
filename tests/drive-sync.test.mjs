import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function harness(allowed = true) {
  const saved = new Map([['old', { drive_file_id:'old', status:'selected', title:'Título editado', notes:'Conservar', drive_folder_id:null }]])
  const sources = [{ folder_id:'rootfolder', folder_name:'Eventos' }]
  const sourceKeys = new Map(), calls = []
  let handler
  const db = { from(name) {
    if (name === 'drive_sources') return {
      select: () => ({ eq: async () => ({ data:sources, error:null }) }),
      update: () => ({ eq: () => ({ eq: async () => ({ error:null }) }) }),
      upsert: async () => ({ error:null }),
    }
    if (name === 'drive_source_access') return {
      select: () => ({ eq: () => ({ eq: (_, folderId) => ({ maybeSingle: async () => ({ data:sourceKeys.get(folderId) || null, error:null }) }) }) }),
      upsert: async (value) => { sourceKeys.set(value.folder_id, value); return { error:null } },
    }
    if (name === 'editorial_content') return {
      insert: async (value) => { if (saved.has(value.drive_file_id)) return { error:{ code:'23505' } }; saved.set(value.drive_file_id, value); return { error:null } },
      update: (metadata) => ({ eq: () => ({ eq: (_, id) => ({ is: async () => { const current = saved.get(id); if (current?.drive_folder_id == null) Object.assign(current, metadata); return { error:null } } }) }) }),
    }
    throw new Error(`Tabla inesperada ${name}`)
  } }
  const fake = {
    accessToken: async () => 'test-token', admin: () => db, configured: () => true, headers: () => ({}), encrypt: async (key) => `encrypted:${key}`, decrypt: async (value) => value.slice('encrypted:'.length),
    json: (_, data, status = 200) => new Response(JSON.stringify(data), { status, headers:{ 'Content-Type':'application/json' } }),
    ownsAccount: async () => allowed, userFor: async () => ({ id:'owner' }),
    googleGet: async (url, _token, keys) => {
      calls.push({ path:url.pathname, keys })
      const query = url.searchParams.get('q') || ''
      if (url.pathname.endsWith('/rootfolder')) return { id:'rootfolder', name:'Eventos', mimeType:'application/vnd.google-apps.folder' }
      if (query.includes("'rootfolder'")) return url.searchParams.has('pageToken') ? { files:[{ id:'new', name:'Vídeo 2', mimeType:'video/mp4', createdTime:'2026-01-01T10:00:00Z' }] } : { files:[{ id:'old', name:'Vídeo 1', mimeType:'video/mp4' },{ id:'subfolder', name:'Taller', mimeType:'application/vnd.google-apps.folder' }], nextPageToken:'next' }
      if (query.includes("'subfolder'")) return { files:[{ id:'nested', name:'Vídeo 3', mimeType:'video/mp4' }] }
      throw new Error('Consulta inesperada')
    },
  }
  const source = readFileSync('supabase/functions/drive-library/index.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS } })
  new Function('require', 'Deno', 'exports', compiled.outputText)((name) => { if (name !== '../_shared/drive.ts') throw new Error('Dependencia inesperada'); return fake }, { serve: (fn) => { handler = fn } }, {})
  return { saved, sourceKeys, calls, request: (body = { action:'sync', accountId:'account' }) => handler(new Request('https://example.com', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) })) }
}

test('sincroniza subcarpetas y páginas sin duplicar ni sobrescribir cambios editoriales', async () => {
  const h = harness()
  let response = await h.request()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { imported:2, skipped:1 })
  assert.equal(h.saved.get('old').status, 'selected')
  assert.equal(h.saved.get('old').title, 'Título editado')
  assert.equal(h.saved.get('old').notes, 'Conservar')
  assert.equal(h.saved.get('old').drive_folder_path, 'Eventos')
  assert.equal(h.saved.get('nested').drive_folder_path, 'Eventos / Taller')
  response = await h.request()
  assert.deepEqual(await response.json(), { imported:0, skipped:3 })
  assert.equal(h.saved.size, 3)
})

test('rechaza sincronizar cuando la cuenta no pertenece al usuario', async () => {
  const h = harness(false)
  assert.equal((await h.request()).status, 403)
  assert.equal(h.saved.size, 1)
})

test('conserva la clave del enlace compartido para consultar y sincronizar la carpeta', async () => {
  const h = harness()
  const response = await h.request({ action:'link_folder', accountId:'account', folderId:'rootfolder', resourceKey:'0-key' })
  assert.equal(response.status, 200)
  assert.deepEqual(h.calls[0].keys, [{ id:'rootfolder', key:'0-key' }])
  assert.equal(h.sourceKeys.get('rootfolder').resource_key_ciphertext, 'encrypted:0-key')
  assert.equal((await h.request()).status, 200)
  assert.ok(h.calls.slice(1).every((call) => call.keys.some((key) => key.id === 'rootfolder' && key.key === '0-key')))
})

test('los estados nuevos se guardan sin abrir acceso a las credenciales', () => {
  const sql = readFileSync('supabase/migrations/20261120_drive_library.sql', 'utf8')
  assert.match(sql, /'pending','selected','editing','scheduled','published'/)
  assert.match(sql, /revoke all on public\.drive_oauth_states, public\.drive_connections/)
  const callback = readFileSync('supabase/functions/drive-oauth-callback/index.ts', 'utf8')
  assert.match(callback, /\.delete\(\).*state_hash/)
  assert.match(callback, /encrypt\(tokens\.refresh_token/)
})

test('el token se cifra con AES-GCM y queda ligado a la cuenta', async () => {
  const source = readFileSync('supabase/functions/_shared/drive.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS } })
  const exports = {}
  const key = Buffer.alloc(32, 7).toString('base64')
  const fakeDeno = { env:{ get: (name) => name === 'DRIVE_TOKEN_ENCRYPTION_KEY' ? key : '' } }
  new Function('require', 'Deno', 'exports', compiled.outputText)((name) => { if (name.startsWith('https://esm.sh/')) return { createClient: () => ({}) }; throw new Error('Dependencia inesperada') }, fakeDeno, exports)
  const ciphertext = await exports.encrypt('secreto-de-prueba', 'account-1')
  assert.doesNotMatch(ciphertext, /secreto-de-prueba/)
  assert.equal(await exports.decrypt(ciphertext, 'account-1'), 'secreto-de-prueba')
  await assert.rejects(exports.decrypt(ciphertext, 'account-2'))
})

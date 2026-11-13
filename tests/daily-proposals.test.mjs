import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('supabase/functions/instagram-daily-proposals/index.ts', 'utf8').replace(/^import .*\n/, '')
const compiled = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, ignoreDeprecations: '6.0' } })
assert.equal(compiled.diagnostics?.length, 0)
function handlerFor(environment, createClient = () => { throw new Error('No debe acceder a la base de datos') }) {
  let handler
  const deno = { env: { get: (name) => environment[name] }, serve: (callback) => { handler = callback } }
  new Function('Deno', 'createClient', compiled.outputText)(deno, createClient)
  return handler
}

test('rechaza métodos diferentes de POST', async () => {
  const result = await handlerFor({})(new Request('https://example.com', { method: 'GET' }))
  assert.equal(result.status, 405)
})

test('rechaza peticiones sin el secreto del programador', async () => {
  const result = await handlerFor({ DAILY_PROPOSALS_SECRET: 'private' })(new Request('https://example.com', { method: 'POST' }))
  assert.equal(result.status, 401)
})

test('no ejecuta la generación si falta configurar Gemini', async () => {
  const handler = handlerFor({ DAILY_PROPOSALS_SECRET: 'private' })
  const result = await handler(new Request('https://example.com', { method: 'POST', headers: { 'x-daily-proposals-secret': 'private' } }))
  assert.equal(result.status, 503)
})

test('no duplica un lote diario que ya existe', async () => {
  const createClient = () => ({ from: (table) => table === 'instagram_accounts' ? {
    select: () => ({ ilike: () => ({ eq: async () => ({ data: [{ id: 'account', username: 'retorika_academy' }], error: null }) }) }),
  } : {
    insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '23505' } }) }) }),
  } })
  const handler = handlerFor({ DAILY_PROPOSALS_SECRET: 'private', SUPABASE_URL: 'https://example.com', SUPABASE_SERVICE_ROLE_KEY: 'test', GEMINI_API_KEY: 'test' }, createClient)
  const result = await handler(new Request('https://example.com', { method: 'POST', headers: { 'x-daily-proposals-secret': 'private' } }))
  assert.deepEqual((await result.json()).results, [{ account: 'account', status: 'already_started' }])
})

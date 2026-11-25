import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function harness({ user = { id: 'user-1', is_anonymous: false }, account = { id: 'account-1', username: 'demo' }, geminiOk = true } = {}) {
  let handler, geminiCalls = 0
  const admin = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table) => {
      if (table === 'instagram_accounts') {
        const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: account, error: null }) }
        return chain
      }
      if (table === 'media_metrics') {
        const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: async () => ({ data: [], error: null }) }
        return chain
      }
      throw new Error(`Tabla inesperada: ${table}`)
    },
  }
  const env = { APP_ORIGIN: 'https://radar.example', SUPABASE_URL: 'https://supabase.example', SUPABASE_SERVICE_ROLE_KEY: 'test', GEMINI_API_KEY: 'test' }
  const fakeFetch = async () => {
    geminiCalls++
    const analysis = { summary: 'Resumen', limitations: 'Registro manual', matches: [], differences: [], activeSegments: 'Sin datos', strategy: 'Contrastar', recommendations: [{ priority: 'alta', action: 'Revisar', reason: 'Faltan datos' }] }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] }), { status: geminiOk ? 200 : 503 })
  }
  const source = readFileSync('supabase/functions/instagram-audience-analysis/index.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
  new Function('require', 'Deno', 'fetch', 'exports', compiled.outputText)(() => ({ createClient: () => admin }), { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn } }, fakeFetch, {})
  const request = (body, authorization = 'Bearer test') => handler(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body) }))
  return { request, calls: () => geminiCalls }
}

const validBody = { accountId: 'account-1', profile: { age: '25-34' }, audience: { date: '2026-11-25', totalFollowers: 100 } }

test('genera un análisis con una cuenta autorizada y datos válidos', async () => {
  const h = harness()
  const response = await h.request(validBody)
  assert.equal(response.status, 200)
  const { analysis } = await response.json()
  assert.equal(analysis.summary, 'Resumen')
  assert.equal(analysis.recommendations[0].action, 'Revisar')
  assert.equal(h.calls(), 1)
})

test('requiere una sesión y una cuenta accesible antes de llamar a Gemini', async () => {
  const noSession = harness()
  assert.equal((await noSession.request(validBody, '')).status, 401)
  assert.equal(noSession.calls(), 0)
  const noAccount = harness({ account: null })
  assert.equal((await noAccount.request(validBody)).status, 404)
  assert.equal(noAccount.calls(), 0)
})

test('rechaza perfiles vacíos y comunica fallos del proveedor', async () => {
  const empty = harness()
  assert.equal((await empty.request({ ...validBody, profile: {} })).status, 400)
  assert.equal(empty.calls(), 0)
  const failed = harness({ geminiOk: false })
  assert.equal((await failed.request(validBody)).status, 502)
})

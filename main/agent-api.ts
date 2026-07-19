import { app, safeStorage } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { all, getDb } from '../shared/database'
import { generateAi } from './ai'
import { generateOpenRouterImage, generateOpenRouterSpeech, generateWhatsAppSpeech, getAiMediaUsage, listMediaModels, transcribeAudio } from './ai-media'
import { getAiAccessCandidates, getConnectionStatus, sendMessage } from './whatsapp'

type AgentApiConfig = { enabled: boolean; port: number; token: string }
let server: http.Server | null = null
let runtimeError = ''

function filePath() { return path.join(app.getPath('userData'), 'agent-api.json') }
function newToken() { return `zpm_${crypto.randomBytes(24).toString('hex')}` }

function readConfig(): AgentApiConfig {
  try {
    const stored = JSON.parse(fs.readFileSync(filePath(), 'utf8'))
    const buffer = Buffer.from(String(stored.token || ''), 'base64')
    const token = buffer.length ? (safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buffer) : buffer.toString('utf8')) : newToken()
    return { enabled: Boolean(stored.enabled), port: Number(stored.port || 3210), token }
  } catch {
    const config = { enabled: false, port: 3210, token: newToken() }
    writeConfig(config)
    return config
  }
}

function writeConfig(config: AgentApiConfig) {
  const raw = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(config.token) : Buffer.from(config.token, 'utf8')
  fs.writeFileSync(filePath(), JSON.stringify({ enabled: config.enabled, port: config.port, token: raw.toString('base64') }, null, 2), 'utf8')
}

export function getAgentApiConfig() {
  const config = readConfig()
  return { ...config, running: Boolean(server?.listening), error: runtimeError, baseUrl: `http://127.0.0.1:${config.port}/v1` }
}

export async function updateAgentApiConfig(input: { enabled?: boolean; port?: number; regenerateToken?: boolean }) {
  const current = readConfig()
  const port = input.port === undefined ? current.port : Number(input.port)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use uma porta entre 1024 e 65535.')
  const next = { enabled: input.enabled ?? current.enabled, port, token: input.regenerateToken ? newToken() : current.token }
  writeConfig(next)
  await restartAgentApi()
  return getAgentApiConfig()
}

export async function restartAgentApi() {
  await stopAgentApi()
  const config = readConfig()
  runtimeError = ''
  if (!config.enabled) return
  server = http.createServer((req, res) => void handleRequest(req, res, config))
  await new Promise<void>((resolve) => {
    server!.once('error', (error: any) => { runtimeError = error?.code === 'EADDRINUSE' ? `Porta ${config.port} já está em uso.` : error?.message || 'Falha ao iniciar API.'; server = null; resolve() })
    server!.listen(config.port, '127.0.0.1', resolve)
  })
}

export async function stopAgentApi() {
  const active = server
  server = null
  if (!active) return
  await new Promise<void>(resolve => active.close(() => resolve()))
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse, config: AgentApiConfig) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  const url = new URL(req.url || '/', `http://127.0.0.1:${config.port}`)
  if (req.method === 'GET' && url.pathname === '/v1/health') return json(res, 200, { ok: true, service: 'zap-magico-agent-api' })
  if (req.headers.authorization !== `Bearer ${config.token}`) return json(res, 401, { success: false, error: 'Token Bearer inválido.' })
  try {
    if (req.method === 'GET' && url.pathname === '/v1/accounts') {
      const rows = all(await getDb(), 'SELECT id,name,phone,status,is_default FROM whatsapp_accounts ORDER BY is_default DESC,created_at') as any[]
      return json(res, 200, rows.map(row => ({ ...row, ...getConnectionStatus(row.id) })))
    }
    const statusMatch = url.pathname.match(/^\/v1\/accounts\/([^/]+)\/status$/)
    if (req.method === 'GET' && statusMatch) return json(res, 200, getConnectionStatus(decodeURIComponent(statusMatch[1])))
    if (req.method === 'GET' && url.pathname === '/v1/inbox') {
      const accountId = url.searchParams.get('accountId') || 'default'
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)))
      return json(res, 200, all(await getDb(), 'SELECT * FROM inbox WHERE account_id = ? ORDER BY received_at DESC LIMIT ?', [accountId, limit]))
    }
    if (req.method === 'GET' && url.pathname === '/v1/ai/access-candidates') {
      return json(res, 200, await getAiAccessCandidates(url.searchParams.get('accountId') || 'default'))
    }
    if (req.method === 'GET' && url.pathname === '/v1/ai/media-models') {
      const rawKind = url.searchParams.get('kind')
      const kind = rawKind === 'voice' || rawKind === 'transcription' ? rawKind : 'image'
      return json(res, 200, await listMediaModels(kind, url.searchParams.get('accountId') || 'default'))
    }
    if (req.method === 'GET' && url.pathname === '/v1/ai/media-usage') {
      return json(res, 200, await getAiMediaUsage(url.searchParams.get('accountId') || 'default'))
    }
    if (req.method === 'POST' && url.pathname === '/v1/messages/send') {
      const body = await readJson(req)
      if (!body.to || !body.message) return json(res, 400, { success: false, error: 'Informe to e message.' })
      return json(res, 200, await sendMessage(String(body.to), String(body.message), String(body.accountId || 'default')))
    }
    if (req.method === 'POST' && url.pathname === '/v1/ai/generate') {
      const body = await readJson(req)
      if (!body.text) return json(res, 400, { success: false, error: 'Informe text.' })
      return json(res, 200, await generateAi({ text: String(body.text), action: body.action, provider: body.provider, accountId: String(body.accountId || 'default') }))
    }
    if (req.method === 'POST' && url.pathname === '/v1/ai/image') {
      const body = await readJson(req)
      if (!body.prompt) return json(res, 400, { success: false, error: 'Informe prompt.' })
      return json(res, 200, await generateOpenRouterImage(String(body.accountId || 'default'), String(body.prompt), body.options || {}))
    }
    if (req.method === 'POST' && url.pathname === '/v1/ai/speech') {
      const body = await readJson(req)
      if (!body.text) return json(res, 400, { success: false, error: 'Informe text.' })
      const generate = body.options?.whatsappReady ? generateWhatsAppSpeech : generateOpenRouterSpeech
      return json(res, 200, await generate(String(body.accountId || 'default'), String(body.text), body.options || {}))
    }
    if (req.method === 'POST' && url.pathname === '/v1/ai/transcribe') {
      const body = await readJson(req)
      if (!body.base64) return json(res, 400, { success: false, error: 'Informe base64 e format.' })
      return json(res, 200, await transcribeAudio(String(body.accountId || 'default'), Buffer.from(String(body.base64), 'base64'), String(body.format || 'ogg')))
    }
    return json(res, 404, { success: false, error: 'Endpoint não encontrado.' })
  } catch (error: any) {
    return json(res, 500, { success: false, error: error?.message || 'Erro interno.' })
  }
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.end(JSON.stringify(data))
}

async function readJson(req: http.IncomingMessage) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 1024 * 1024) throw new Error('Corpo da requisição excede 1 MB.')
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new Error('JSON inválido.') }
}

import type { WASocket, DisconnectReason } from 'baileys'
import { all, one, run, getDb } from '../shared/database'
import NodeCache from 'node-cache'
import path from 'path'
import { app, BrowserWindow, safeStorage } from 'electron'
import fs from 'fs'
import { generateAi, isAiGroupAuthorized, isAiSenderAuthorized, isAutoReplyEnabled } from './ai'

const msgCache = new NodeCache({ stdTTL: 60 })
const groupCache = new NodeCache({ stdTTL: 300 })
type AccountConnection = { sock: WASocket | null; connecting: Promise<void> | null; reconnectTimer: ReturnType<typeof setTimeout> | null; shouldReconnect: boolean; reconnectAttempts: number; phase: 'disconnected' | 'connecting' | 'connected' }
const connections = new Map<string, AccountConnection>()
let mainWindow: BrowserWindow | null = null
const autoReplyTimers = new Map<string, ReturnType<typeof setTimeout>>()
const autoReplyBusy = new Set<string>()

type BaileysModule = typeof import('baileys')

async function getBaileys(): Promise<BaileysModule> {
  return import('baileys') as Promise<BaileysModule>
}

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win
}

function notify(channel: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

function connection(accountId: string) {
  if (!connections.has(accountId)) connections.set(accountId, { sock: null, connecting: null, reconnectTimer: null, shouldReconnect: true, reconnectAttempts: 0, phase: 'disconnected' })
  return connections.get(accountId)!
}

function queueAiAutoReply(accountId: string, phone: string) {
  const key = `${accountId}:${phone}`
  if (!isAutoReplyEnabled(accountId) || autoReplyBusy.has(key)) return
  const previous = autoReplyTimers.get(key)
  if (previous) clearTimeout(previous)
  const timer = setTimeout(async () => {
    autoReplyTimers.delete(key)
    autoReplyBusy.add(key)
    try {
      const db = await getDb()
      const history = all(db, 'SELECT * FROM inbox WHERE account_id = ? AND phone = ? ORDER BY received_at DESC LIMIT 10', [accountId, phone]).reverse()
      const context = history.map((item: any) => `${item.from_me ? 'Atendente' : 'Cliente'}: ${item.message}`).join('\n')
      const result = await generateAi({ text: context, action: 'reply', accountId })
      if (!result.success || !result.text) {
        notify('ai:auto-reply', { success: false, phone, error: result.error || 'Nenhum provedor de IA respondeu.' })
        return
      }
      const sent = await sendMessage(phone, result.text, accountId)
      notify('ai:auto-reply', { success: sent.success, accountId, phone, error: sent.error || '' })
    } catch (error: any) {
      notify('ai:auto-reply', { success: false, phone, error: error?.message || 'Falha ao gerar resposta.' })
    } finally {
      autoReplyBusy.delete(key)
    }
  }, 1800)
  autoReplyTimers.set(key, timer)
}

export async function connectWA(accountId = 'default'): Promise<void> {
  const state = connection(accountId)
  state.shouldReconnect = true
  if (state.sock && state.phase !== 'disconnected') return
  if (state.connecting) return state.connecting
  state.phase = 'connecting'
  notify('wa:status', { accountId, status: 'connecting' })
  await updateAccountState(accountId, 'connecting', '')
  state.connecting = openConnection(accountId)
  try { await state.connecting } catch (error) {
    state.phase = 'disconnected'
    state.sock = null
    notify('wa:status', { accountId, status: 'disconnected', error: error instanceof Error ? error.message : 'Falha ao conectar' })
    await updateAccountState(accountId, 'disconnected', '')
    throw error
  } finally { state.connecting = null }
}

async function openConnection(accountId: string): Promise<void> {
  const baileys = await getBaileys()
  const sessionsRoot = path.join(app.getPath('userData'), 'wa-sessions')
  const sDir = path.join(sessionsRoot, accountId.replace(/[^a-zA-Z0-9_-]/g, '_'))
  const legacyDir = path.join(app.getPath('userData'), 'wa-session')
  if (accountId === 'default' && fs.existsSync(legacyDir) && !fs.existsSync(sDir)) fs.cpSync(legacyDir, sDir, { recursive: true })
  await restoreSessionFromSql(accountId, sDir)
  const { state, saveCreds } = await baileys.useMultiFileAuthState(sDir)

  const currentSock = baileys.makeWASocket({
    auth: state,
    syncFullHistory: false,
    browser: ['Zap Magico WPP Web QR', 'Chrome', '1.4.1'],
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache: msgCache,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 25000,
    markOnlineOnConnect: true,
    patchMessageBeforeSending: (m) => m,
    cachedGroupMetadata: async (jid) => groupCache.get(`${accountId}:${jid}`),
  })
  const account = connection(accountId)
  account.sock = currentSock

  currentSock.ev.on('creds.update', async () => {
    if (connection(accountId).sock !== currentSock) return
    await saveCreds()
    if (connection(accountId).sock === currentSock) await syncSessionToSql(accountId, sDir)
  })

  currentSock.ev.on('connection.update', async (u) => {
    if (u.qr) {
      account.phase = 'connecting'
      notify('wa:qr', { accountId, qr: u.qr })
    }
    if (u.connection === 'connecting') notify('wa:status', { accountId, status: 'connecting' })
    if (u.connection === 'close') {
      if (account.sock !== currentSock) return
      const error = u.lastDisconnect?.error as any
      const rawCode = error?.output?.statusCode ?? error?.data?.statusCode ?? error?.data?.reason ?? error?.statusCode
      const code = Number(rawCode) as DisconnectReason
      const authInvalid = code === baileys.DisconnectReason.loggedOut || code === 401
      const err = authInvalid ? 'Sessão expirada. Conecte novamente e leia um novo QR Code.'
        : code === baileys.DisconnectReason.connectionReplaced ? 'Conexão substituída'
        : 'Desconectado'
      console.warn('[wa:close]', { accountId, code: Number.isFinite(code) ? code : 'unknown', reason: error?.data?.location || error?.message || 'unknown' })
      notify('wa:status', { accountId, status: 'disconnected', error: err })
      account.sock = null
      account.phase = 'disconnected'
      void updateAccountState(accountId, 'disconnected', '')
      if (authInvalid) {
        account.shouldReconnect = false
        account.reconnectAttempts = 0
        await clearInvalidSession(accountId, sDir)
      }
      const canRetry = account.shouldReconnect
        && !authInvalid
        && code !== baileys.DisconnectReason.connectionReplaced
        && account.reconnectAttempts < 3
      if (canRetry) {
        account.reconnectAttempts += 1
        if (account.reconnectTimer) clearTimeout(account.reconnectTimer)
        const delay = 3000 * account.reconnectAttempts
        account.reconnectTimer = setTimeout(() => { account.reconnectTimer = null; void connectWA(accountId) }, delay)
      } else if (!authInvalid && account.shouldReconnect && account.reconnectAttempts >= 3) {
        account.shouldReconnect = false
        notify('wa:status', { accountId, status: 'disconnected', error: 'Não foi possível estabilizar a conexão. Clique em Conectar para tentar novamente.' })
      }
    }
    if (u.connection === 'open') {
      const phone = currentSock.user?.id?.split(':')[0] || ''
      account.phase = 'connected'
      account.reconnectAttempts = 0
      notify('wa:status', { accountId, status: 'connected', phone })
      void updateAccountState(accountId, 'connected', phone)
      void refreshAccountGroups(accountId, currentSock)
    }
  })

  currentSock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      if (msg.key?.id) msgCache.set(msg.key.id, msg)
      const remoteJid = msg.key?.remoteJid || ''
      const alternateJid = msg.key?.remoteJidAlt || ''
      if (remoteJid === 'status@broadcast' || alternateJid === 'status@broadcast') continue
      if (remoteJid.endsWith('@g.us')) {
        if (!isAiGroupAuthorized(accountId, remoteJid)) continue
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        if (!text) continue
        const conversationId = `group:${remoteJid}`
        const db = await getDb()
        const cached = one(db, 'SELECT subject FROM whatsapp_groups WHERE account_id = ? AND jid = ?', [accountId, remoteJid]) as any
        const groupName = cached?.subject || 'Grupo WhatsApp'
        const storedText = !msg.key.fromMe && msg.pushName ? `${msg.pushName}: ${text}` : text
        run(db, 'INSERT OR IGNORE INTO inbox (id, account_id, phone, contact_name, message, from_me, read, source_jid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`${accountId}:${msg.key.id || crypto.randomUUID()}`, accountId, conversationId, groupName, storedText, msg.key.fromMe ? 1 : 0, msg.key.fromMe ? 1 : 0, remoteJid])
        notify('inbox:new', { accountId, phone: conversationId, contact_name: groupName, message: storedText, from_me: Boolean(msg.key.fromMe), is_group: true })
        if (m.type === 'notify' && !msg.key.fromMe) queueAiAutoReply(accountId, conversationId)
        continue
      }
      const phoneJid = alternateJid.endsWith('@s.whatsapp.net') ? alternateJid : remoteJid
      if (!phoneJid.endsWith('@s.whatsapp.net') && !phoneJid.endsWith('@lid')) continue
      const phone = phoneJid.endsWith('@lid')
        ? `lid:${phoneJid.replace('@lid', '')}`
        : phoneJid.replace('@s.whatsapp.net', '')
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
      if (!phone || !text) continue
      try {
        const db = await getDb()
        run(db, 'INSERT OR IGNORE INTO inbox (id, account_id, phone, contact_name, message, from_me, read, source_jid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [`${accountId}:${msg.key.id || crypto.randomUUID()}`, accountId, phone, msg.pushName || '', text, msg.key.fromMe ? 1 : 0, msg.key.fromMe ? 1 : 0, remoteJid])
        notify('inbox:new', { accountId, phone, contact_name: msg.pushName || '', message: text, from_me: Boolean(msg.key.fromMe) })
        if (m.type === 'notify' && !msg.key.fromMe) {
          await runAutomationRules(accountId, phone, text)
          const authorized = await isAiSenderAuthorized(
            accountId,
            [phone, remoteJid, alternateJid],
            (lidJid) => currentSock.signalRepository.lidMapping.getPNForLID(lidJid),
          )
          if (authorized) queueAiAutoReply(accountId, phone)
        }
      } catch (_) {}
    }
    if (connection(accountId).sock === currentSock) void syncSessionToSql(accountId, sDir)
  })
}

async function refreshAccountGroups(accountId: string, sock: WASocket) {
  try {
    const groups = await sock.groupFetchAllParticipating() as Record<string, any>
    const db = await getDb()
    for (const [jid, metadata] of Object.entries(groups || {})) {
      groupCache.set(`${accountId}:${jid}`, metadata)
      run(db, `INSERT INTO whatsapp_groups (account_id,jid,subject,participant_count,updated_at) VALUES (?,?,?,?,datetime('now'))
        ON CONFLICT(account_id,jid) DO UPDATE SET subject=excluded.subject,participant_count=excluded.participant_count,updated_at=datetime('now')`,
        [accountId, jid, String(metadata?.subject || 'Grupo WhatsApp'), Number(metadata?.participants?.length || 0)])
    }
  } catch {}
}

export async function getAiAccessCandidates(accountId = 'default') {
  const state = connection(accountId)
  if (state.phase === 'connected' && state.sock) await refreshAccountGroups(accountId, state.sock)
  const db = await getDb()
  const contacts = all(db, `SELECT phone AS id, MAX(CASE WHEN contact_name <> '' THEN contact_name ELSE phone END) AS name, MAX(received_at) AS last_message_at
    FROM inbox WHERE account_id = ? AND phone NOT LIKE 'group:%' GROUP BY phone ORDER BY last_message_at DESC LIMIT 300`, [accountId])
  const groups = all(db, 'SELECT jid AS id, subject AS name, participant_count, updated_at FROM whatsapp_groups WHERE account_id = ? ORDER BY subject', [accountId])
  return { connected: state.phase === 'connected', contacts, groups }
}

async function clearInvalidSession(accountId: string, sessionDir: string) {
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
  if (accountId === 'default') {
    const legacyDir = path.join(app.getPath('userData'), 'wa-session')
    if (fs.existsSync(legacyDir)) fs.rmSync(legacyDir, { recursive: true, force: true })
  }
  const db = await getDb()
  run(db, 'DELETE FROM whatsapp_session_store WHERE account_id = ?', [accountId])
  run(db, "UPDATE whatsapp_accounts SET status = 'disconnected', phone = '', updated_at = datetime('now') WHERE id = ?", [accountId])
}

async function syncSessionToSql(accountId: string, sessionDir: string) {
  if (!fs.existsSync(sessionDir)) return
  const db = await getDb()
  for (const fileName of fs.readdirSync(sessionDir).filter(name => name.endsWith('.json'))) {
    try {
      const raw = fs.readFileSync(path.join(sessionDir, fileName), 'utf8')
      const payload = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(raw).toString('base64') : Buffer.from(raw).toString('base64')
      run(db, `INSERT INTO whatsapp_session_store (account_id,file_name,encrypted_payload,updated_at) VALUES (?,?,?,datetime('now'))
        ON CONFLICT(account_id,file_name) DO UPDATE SET encrypted_payload=excluded.encrypted_payload,updated_at=datetime('now')`, [accountId, fileName, payload])
    } catch {}
  }
}

async function restoreSessionFromSql(accountId: string, sessionDir: string) {
  const db = await getDb()
  const rows = all(db, 'SELECT file_name, encrypted_payload FROM whatsapp_session_store WHERE account_id = ?', [accountId]) as any[]
  if (!rows.length) return
  fs.mkdirSync(sessionDir, { recursive: true })
  for (const row of rows) {
    if (!/^[a-zA-Z0-9_.-]+\.json$/.test(row.file_name)) continue
    const target = path.join(sessionDir, row.file_name)
    if (fs.existsSync(target)) continue
    try {
      const buffer = Buffer.from(row.encrypted_payload, 'base64')
      const raw = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buffer) : buffer.toString('utf8')
      fs.writeFileSync(target, raw, 'utf8')
    } catch {}
  }
}

export async function restoreWA() {
  const db = await getDb()
  const accounts = all(db, 'SELECT id FROM whatsapp_accounts') as { id: string }[]
  let restored = false
  for (const item of accounts) {
    const current = path.join(app.getPath('userData'), 'wa-sessions', item.id.replace(/[^a-zA-Z0-9_-]/g, '_'), 'creds.json')
    const legacy = path.join(app.getPath('userData'), 'wa-session', 'creds.json')
    const credsPath = item.id === 'default' && !fs.existsSync(current) ? legacy : current
    if (!fs.existsSync(credsPath)) continue
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
      if (!creds.registered && !creds.me?.id) continue
      await connectWA(item.id)
      restored = true
    } catch {}
  }
  return restored
}

export async function disconnectWA(accountId = 'default') {
  const account = connection(accountId)
  account.shouldReconnect = false
  if (account.reconnectTimer) clearTimeout(account.reconnectTimer)
  account.reconnectTimer = null
  const currentSock = account.sock
  account.sock = null
  account.phase = 'disconnected'
  notify('wa:status', { accountId, status: 'disconnected' })
  await updateAccountState(accountId, 'disconnected', '')
  try { currentSock?.end(new Error('Desconectado pelo usuário')) } catch {}
  return { success: true }
}

export async function unlinkWA(accountId = 'default') {
  const account = connection(accountId)
  account.shouldReconnect = false
  if (account.reconnectTimer) clearTimeout(account.reconnectTimer)
  account.reconnectTimer = null
  const currentSock = account.sock
  account.sock = null
  account.phase = 'disconnected'
  try {
    if (currentSock?.user?.id) await currentSock.logout()
    else currentSock?.end(new Error('Sessão desvinculada pelo usuário'))
  } catch {}

  const sessionDir = path.join(app.getPath('userData'), 'wa-sessions', accountId.replace(/[^a-zA-Z0-9_-]/g, '_'))
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
  if (accountId === 'default') {
    const legacyDir = path.join(app.getPath('userData'), 'wa-session')
    if (fs.existsSync(legacyDir)) fs.rmSync(legacyDir, { recursive: true, force: true })
  }
  const db = await getDb()
  run(db, 'DELETE FROM whatsapp_session_store WHERE account_id = ?', [accountId])
  run(db, "UPDATE whatsapp_accounts SET status = 'disconnected', phone = '', updated_at = datetime('now') WHERE id = ?", [accountId])
  notify('wa:status', { accountId, status: 'disconnected', unlinked: true })
  return { success: true }
}

export function getConnectionStatus(accountId = 'default') {
  const state = connection(accountId)
  const sock = state.sock
  if (state.phase !== 'connected' || !sock || !sock.user?.id) return { connected: false, accountId, status: state.phase }
  return { connected: true, accountId, status: 'connected', phone: sock.user?.id?.split(':')[0] || '' }
}

export function interpolate(tpl: string, vars: Record<string, string>) {
  return tpl
    .replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{${k}}`)
    .replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

function ms(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function updateAccountState(accountId: string, status: string, phone: string) {
  const db = await getDb()
  run(db, `UPDATE whatsapp_accounts SET status = ?, phone = CASE WHEN ? <> '' THEN ? ELSE phone END, updated_at = datetime('now') WHERE id = ?`,
    [status, phone, phone, accountId])
}

async function runAutomationRules(accountId: string, phone: string, message: string) {
  const db = await getDb()
  const normalized = message.toLocaleLowerCase('pt-BR')
  const rules = all(db, `SELECT * FROM automation_rules WHERE enabled = 1 AND (account_id = '*' OR account_id = ?)`, [accountId]) as any[]
  for (const rule of rules) {
    const keyword = String(rule.keyword || '').trim().toLocaleLowerCase('pt-BR')
    if (keyword && !normalized.includes(keyword)) continue
    const current = one(db, 'SELECT * FROM conversations WHERE account_id = ? AND phone = ?', [accountId, phone]) as any
    const tags = new Set(String(current?.tags || '').split(',').map((tag: string) => tag.trim()).filter(Boolean))
    if (rule.add_tag) tags.add(rule.add_tag)
    run(db, `INSERT INTO conversations (account_id, phone, status, priority, tags, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(account_id, phone) DO UPDATE SET
        status = CASE WHEN excluded.status <> '' THEN excluded.status ELSE conversations.status END,
        priority = CASE WHEN excluded.priority <> '' THEN excluded.priority ELSE conversations.priority END,
        tags = excluded.tags, updated_at = datetime('now')`,
      [accountId, phone, rule.set_status || current?.status || 'open', rule.set_priority || current?.priority || 'normal', [...tags].join(', ')])
    run(db, "UPDATE automation_rules SET executions = executions + 1, updated_at = datetime('now') WHERE id = ?", [rule.id])
    if (String(rule.reply || '').trim()) await sendMessage(phone, interpolate(rule.reply, { phone }), accountId)
    notify('automation:executed', { accountId, phone, ruleId: rule.id, name: rule.name })
  }
}

export async function sendMessage(phone: string, message: string, accountId = 'default') {
  const sock = connection(accountId).sock
  if (!sock) return { success: false, error: 'WhatsApp não conectado' }

  const jid = phone.startsWith('group:')
    ? phone.slice(6)
    : phone.startsWith('lid:')
      ? `${phone.slice(4).replace(/\D/g, '')}@lid`
      : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
  if (!jid.endsWith('@g.us') && !jid.endsWith('@lid') && !jid.endsWith('@s.whatsapp.net')) return { success: false, error: 'Destino inválido' }
  try {
    const sent = await sock.sendMessage(jid, { text: message })
    const db = await getDb()
    run(db, 'INSERT INTO send_log (id, account_id, phone, message, status) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), accountId, phone, message, 'sent'])
    run(db, 'INSERT OR IGNORE INTO inbox (id, account_id, phone, contact_name, message, from_me, read, source_jid) VALUES (?, ?, ?, ?, ?, 1, 1, ?)',
      [`${accountId}:${sent?.key?.id || crypto.randomUUID()}`, accountId, phone.startsWith('group:') || phone.startsWith('lid:') ? phone : phone.replace(/\D/g, ''), '', message, jid])
    notify('inbox:new', { accountId, phone: phone.startsWith('group:') || phone.startsWith('lid:') ? phone : phone.replace(/\D/g, ''), contact_name: '', message, from_me: true })
    return { success: true }
  } catch (err: any) {
    const e = err?.message || 'Erro ao enviar'
    const db = await getDb()
    run(db, 'INSERT INTO send_log (id, account_id, phone, message, status, error) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), accountId, phone, message, 'failed', e])
    return { success: false, error: e }
  }
}

export async function massSend(campaignId: string, onProgress?: (s: number, f: number, t: number) => void) {
  const db = await getDb()
  const camp = one(db, 'SELECT * FROM campaigns WHERE id = ?', [campaignId]) as any
  if (!camp) return { sent: 0, failed: 0, errors: [] }

  const set = one(db, "SELECT value FROM settings WHERE key = 'daily_limit'") as any
  const dailyLimit = parseInt(set?.value || '500')

  const msgs = all(db,
    `SELECT cm.*, c.name as cname, c.phone as cphone
     FROM campaign_messages cm JOIN contacts c ON cm.contact_id = c.id
     WHERE cm.campaign_id = ? AND cm.status = 'pending'`, [campaignId])

  run(db, "UPDATE campaigns SET status = 'running' WHERE id = ?", [campaignId])

  let sent = 0, failed = 0
  const errors: { phone: string; error: string }[] = []
  const total = msgs.length

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]

    const todayCount = one(db,
      "SELECT COUNT(*) as c FROM send_log WHERE status = 'sent' AND date(sent_at) = date('now')") as any
    if ((todayCount?.c || 0) >= dailyLimit) {
      run(db, "UPDATE campaigns SET status = 'paused' WHERE id = ?", [campaignId])
      notify('campaign:paused', { campaignId, reason: 'Limite diário' })
      return { sent, failed, errors }
    }

    const r = await sendMessage(m.cphone, m.message)
    if (r.success) {
      sent++
      run(db, "UPDATE campaign_messages SET status = 'sent', sent_at = datetime('now') WHERE id = ?", [m.id])
    } else {
      failed++
      errors.push({ phone: m.cphone, error: r.error || '' })
      run(db, "UPDATE campaign_messages SET status = 'failed', error = ? WHERE id = ?", [r.error || '', m.id])
    }

    onProgress?.(sent, failed, total)

    if (i < msgs.length - 1) {
      const dMin = parseInt(camp.delay_min || '10')
      const dMax = parseInt(camp.delay_max || '30')
      await ms(Math.floor(Math.random() * (dMax - dMin + 1) + dMin) * 1000)
    }

    if ((i + 1) % parseInt(camp.pause_every || '50') === 0 && i < msgs.length - 1) {
      notify('campaign:pause', { campaignId, pauseDuration: camp.pause_duration })
      await ms(parseInt(camp.pause_duration || '60') * 1000)
    }
  }

  run(db,
    "UPDATE campaigns SET status = 'completed', sent_count = ?, fail_count = ?, finished_at = datetime('now') WHERE id = ?",
    [sent, failed, campaignId])
  return { sent, failed, errors }
}

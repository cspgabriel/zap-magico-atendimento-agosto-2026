import type { WASocket, DisconnectReason } from 'baileys'
import { all, one, run, getDb } from '../shared/database'
import NodeCache from 'node-cache'
import path from 'path'
import { app, BrowserWindow } from 'electron'
import fs from 'fs'

const msgCache = new NodeCache({ stdTTL: 60 })
let sock: WASocket | null = null
let mainWindow: BrowserWindow | null = null
let connecting: Promise<void> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let shouldReconnect = true

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

export async function connectWA(): Promise<void> {
  shouldReconnect = true
  if (sock) return
  if (connecting) return connecting
  connecting = openConnection()
  try { await connecting } finally { connecting = null }
}

async function openConnection(): Promise<void> {
  const baileys = await getBaileys()
  const sDir = path.join(app.getPath('userData'), 'wa-session')
  const { state, saveCreds } = await baileys.useMultiFileAuthState(sDir)

  const currentSock = baileys.makeWASocket({
    auth: state,
    syncFullHistory: false,
    browser: ['Zap Magico WPP Web QR', 'Chrome', '1.2.0'],
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache: msgCache,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 25000,
    markOnlineOnConnect: true,
    patchMessageBeforeSending: (m) => m,
  })
  sock = currentSock

  currentSock.ev.on('creds.update', saveCreds)

  currentSock.ev.on('connection.update', (u) => {
    if (u.qr) {
      notify('wa:qr', { qr: u.qr })
    }
    if (u.connection === 'connecting') notify('wa:status', { status: 'connecting' })
    if (u.connection === 'close') {
      if (sock !== currentSock) return
      const error = u.lastDisconnect?.error as any
      const code = (error?.output?.statusCode ?? error?.data?.statusCode ?? error?.statusCode) as DisconnectReason
      const err = code === baileys.DisconnectReason.loggedOut ? 'Logout detectado'
        : code === baileys.DisconnectReason.connectionReplaced ? 'Conexão substituída'
        : 'Desconectado'
      notify('wa:status', { status: 'disconnected', error: err })
      sock = null
      const canRetry = shouldReconnect
        && code !== baileys.DisconnectReason.loggedOut
        && code !== baileys.DisconnectReason.connectionReplaced
      if (canRetry) {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => { reconnectTimer = null; void connectWA() }, 5000)
      }
    }
    if (u.connection === 'open') {
      notify('wa:status', { status: 'connected', phone: sock?.user?.id?.split(':')[0] || '' })
    }
  })

  currentSock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      if (msg.key?.id) msgCache.set(msg.key.id, msg)
      const remoteJid = msg.key?.remoteJid || ''
      if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue
      const phoneJid = msg.key?.remoteJidAlt?.endsWith('@s.whatsapp.net') ? msg.key.remoteJidAlt : remoteJid
      if (!phoneJid.endsWith('@s.whatsapp.net') && !phoneJid.endsWith('@lid')) continue
      const phone = phoneJid.endsWith('@lid')
        ? `lid:${phoneJid.replace('@lid', '')}`
        : phoneJid.replace('@s.whatsapp.net', '')
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
      if (!phone || !text) continue
      try {
        const db = await getDb()
        run(db, 'INSERT OR IGNORE INTO inbox (id, phone, contact_name, message, from_me, read, source_jid) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [msg.key.id || crypto.randomUUID(), phone, msg.pushName || '', text, msg.key.fromMe ? 1 : 0, msg.key.fromMe ? 1 : 0, remoteJid])
        notify('inbox:new', { phone, contact_name: msg.pushName || '', message: text, from_me: Boolean(msg.key.fromMe) })
      } catch (_) {}
    }
  })
}

export async function restoreWA() {
  const credsPath = path.join(app.getPath('userData'), 'wa-session', 'creds.json')
  if (!fs.existsSync(credsPath)) return false
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
    if (!creds.registered && !creds.me?.id) return false
    await connectWA()
    return true
  } catch {
    return false
  }
}

export function disconnectWA() {
  shouldReconnect = false
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  const currentSock = sock
  sock = null
  currentSock?.end(new Error('Desconectado pelo usuário'))
}

export function getConnectionStatus() {
  if (!sock || !sock.user?.id) return { connected: false }
  return { connected: true, phone: sock.user?.id?.split(':')[0] || '' }
}

export function interpolate(tpl: string, vars: Record<string, string>) {
  return tpl
    .replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{${k}}`)
    .replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

function ms(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function sendMessage(phone: string, message: string) {
  if (!sock) return { success: false, error: 'WhatsApp não conectado' }

  const jid = phone.startsWith('lid:')
    ? `${phone.slice(4).replace(/\D/g, '')}@lid`
    : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
  try {
    const sent = await sock.sendMessage(jid, { text: message })
    const db = await getDb()
    run(db, 'INSERT INTO send_log (id, phone, message, status) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), phone, message, 'sent'])
    run(db, 'INSERT OR IGNORE INTO inbox (id, phone, contact_name, message, from_me, read, source_jid) VALUES (?, ?, ?, ?, 1, 1, ?)',
      [sent?.key?.id || crypto.randomUUID(), phone.startsWith('lid:') ? phone : phone.replace(/\D/g, ''), '', message, jid])
    notify('inbox:new', { phone: phone.startsWith('lid:') ? phone : phone.replace(/\D/g, ''), contact_name: '', message, from_me: true })
    return { success: true }
  } catch (err: any) {
    const e = err?.message || 'Erro ao enviar'
    const db = await getDb()
    run(db, 'INSERT INTO send_log (id, phone, message, status, error) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), phone, message, 'failed', e])
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

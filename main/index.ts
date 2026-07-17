import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { getDb, all, one, run } from '../shared/database'
import { connectWA, disconnectWA, restoreWA, sendMessage, massSend, setMainWindow, interpolate } from './whatsapp'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { generateAi, getAiConfig, listAiModels, updateAiConfig } from './ai'
import { deleteKnowledge, importKnowledge, listKnowledge } from './knowledge'

let mainWindow: BrowserWindow | null = null
let schedulerInterval: ReturnType<typeof setInterval> | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600,
    title: 'Zap Mágico WPP Web QR',
    frame: process.env.NODE_ENV === 'development' ? true : false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })
  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  setMainWindow(mainWindow)
}

function startScheduler() {
  schedulerInterval = setInterval(async () => {
    try {
      const db = await getDb()
      const due = all(db,
        "SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= datetime('now')")
      for (const camp of due) {
        run(db, "UPDATE campaigns SET status = 'pending' WHERE id = ?", [camp.id])
        massSend(camp.id, (sent, failed, total) => {
          mainWindow?.webContents.send('campaign:progress', { campaignId: camp.id, sent, failed, total })
        })
      }
    } catch (_) {}
  }, 15000)
}

function registerIPC() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('wa:connect', async () => { await connectWA(); return { success: true } })
  ipcMain.handle('wa:disconnect', () => { disconnectWA(); return { success: true } })
  ipcMain.handle('wa:status', () => {
    const ws = require('./whatsapp')
    return ws.getConnectionStatus()
  })
  ipcMain.handle('send:message', async (_, phone: string, message: string) => sendMessage(phone, message))

  // Contacts
  ipcMain.handle('contacts:list', async () => {
    const db = await getDb()
    return all(db, 'SELECT * FROM contacts ORDER BY name')
  })
  ipcMain.handle('contacts:add', async (_, c: any) => {
    const db = await getDb()
    const id = uuidv4()
    run(db, 'INSERT INTO contacts (id, name, phone, group_name, notes) VALUES (?, ?, ?, ?, ?)',
      [id, c.name, c.phone.replace(/\D/g, ''), c.group_name || '', c.notes || ''])
    return { success: true, id }
  })
  ipcMain.handle('contacts:delete', async (_, id: string) => {
    const db = await getDb()
    run(db, 'DELETE FROM contacts WHERE id = ?', [id])
    return { success: true }
  })
  ipcMain.handle('contacts:clear', async () => {
    const db = await getDb()
    run(db, 'DELETE FROM contacts')
    return { success: true }
  })
  ipcMain.handle('contacts:import', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'Planilhas', extensions: ['csv', 'xlsx', 'xls'] }],
      properties: ['openFile'],
    })
    if (res.canceled || !res.filePaths[0]) return { success: false }
    const ext = path.extname(res.filePaths[0]).toLowerCase()
    if (ext !== '.csv') return { success: false, error: 'Apenas CSV suportado' }
    const content = fs.readFileSync(res.filePaths[0], 'utf-8')
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
    const hdr = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const nameIdx = hdr.findIndex((h) => h === 'nome' || h === 'name')
    const phoneIdx = hdr.findIndex((h) => ['telefone', 'phone', 'celular'].includes(h))
    const groupIdx = hdr.findIndex((h) => ['grupo', 'group', 'etiqueta', 'tag', 'lista'].includes(h))
    const notesIdx = hdr.findIndex((h) => ['notas', 'notes', 'observacao', 'observação'].includes(h))
    if (phoneIdx === -1) return { success: false, error: 'Coluna telefone/phone não encontrada' }
    const db = await getDb()
    let count = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      const phone = cols[phoneIdx]?.replace(/\D/g, '')
      if (phone && phone.length >= 10) {
        run(db, 'INSERT INTO contacts (id, name, phone, group_name, notes) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), nameIdx >= 0 ? cols[nameIdx] : phone, phone, groupIdx >= 0 ? cols[groupIdx] : '', notesIdx >= 0 ? cols[notesIdx] : ''])
        count++
      }
    }
    return { success: true, count }
  })

  // Templates
  ipcMain.handle('templates:list', async () => {
    const db = await getDb()
    return all(db, 'SELECT * FROM templates ORDER BY name')
  })
  ipcMain.handle('templates:save', async (_, t: any) => {
    const db = await getDb()
    if (t.id) {
      run(db, 'UPDATE templates SET name = ?, message = ? WHERE id = ?', [t.name, t.message, t.id])
    } else {
      const id = uuidv4()
      run(db, 'INSERT INTO templates (id, name, message) VALUES (?, ?, ?)', [id, t.name, t.message])
      return { success: true, id }
    }
    return { success: true }
  })
  ipcMain.handle('templates:delete', async (_, id: string) => {
    const db = await getDb()
    run(db, 'DELETE FROM templates WHERE id = ?', [id])
    return { success: true }
  })

  // Campaigns
  ipcMain.handle('campaigns:list', async () => {
    const db = await getDb()
    return all(db, 'SELECT * FROM campaigns ORDER BY created_at DESC')
  })
  ipcMain.handle('campaigns:create', async (_, c: any) => {
    const db = await getDb()
    const id = uuidv4()
    const tpl = one(db, 'SELECT * FROM templates WHERE id = ?', [c.templateId]) as any
    const baseMessage = String(c.message || tpl?.message || '')

    const status = c.scheduled_at ? 'scheduled' : 'pending'
    run(db,
      `INSERT INTO campaigns (id, name, template_id, total_contacts, delay_min, delay_max, pause_every, pause_duration, daily_limit, status, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, c.name, c.templateId || null, c.contactIds.length,
       c.delay_min ?? 10, c.delay_max ?? 30, c.pause_every ?? 50, c.pause_duration ?? 60, c.daily_limit ?? 500,
       status, c.scheduled_at || null])

    const contacts = all(db,
      `SELECT * FROM contacts WHERE id IN (${c.contactIds.map(() => '?').join(',')})`,
      c.contactIds)

    for (const ct of contacts) {
      const firstName = String(ct.name || '').trim().split(/\s+/)[0] || String(ct.phone || '')
      const msg = interpolate(baseMessage, {
        nome: ct.name,
        primeiro_nome: firstName,
        telefone: ct.phone,
        phone: ct.phone,
      })
      run(db,
        'INSERT INTO campaign_messages (id, campaign_id, contact_id, contact_name, phone, message) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, ct.id, ct.name, ct.phone, msg])
    }
    return { success: true, id }
  })
  ipcMain.handle('campaigns:messages', async (_, campaignId: string) => {
    const db = await getDb()
    return all(db, 'SELECT * FROM campaign_messages WHERE campaign_id = ? ORDER BY status', [campaignId])
  })
  ipcMain.handle('campaign:start', async (_, campaignId: string) => {
    return massSend(campaignId, (sent, failed, total) => {
      mainWindow?.webContents.send('campaign:progress', { campaignId, sent, failed, total })
    })
  })
  ipcMain.handle('campaigns:update', async (_, c: any) => {
    const db = await getDb()
    const old = one(db, 'SELECT * FROM campaigns WHERE id = ?', [c.id]) as any
    if (!old) return { success: false, error: 'Campanha não encontrada' }
    const name = c.name ?? old.name
    const delay_min = c.delay_min ?? old.delay_min
    const delay_max = c.delay_max ?? old.delay_max
    const pause_every = c.pause_every ?? old.pause_every
    const pause_duration = c.pause_duration ?? old.pause_duration
    const daily_limit = c.daily_limit ?? old.daily_limit
    const scheduled_at = c.scheduled_at !== undefined ? c.scheduled_at : old.scheduled_at
    const status = scheduled_at ? 'scheduled' : old.status
    run(db,
      `UPDATE campaigns SET name=?, delay_min=?, delay_max=?, pause_every=?, pause_duration=?, daily_limit=?, scheduled_at=?, status=? WHERE id=?`,
      [name, delay_min, delay_max, pause_every, pause_duration, daily_limit, scheduled_at, status, c.id])
    return { success: true }
  })
  ipcMain.handle('campaigns:delete', async (_, id: string) => {
    const db = await getDb()
    run(db, 'DELETE FROM campaign_messages WHERE campaign_id = ?', [id])
    run(db, 'DELETE FROM campaigns WHERE id = ?', [id])
    return { success: true }
  })

  // Reports
  ipcMain.handle('reports:log', async (_, days = 7) => {
    const db = await getDb()
    return all(db, "SELECT * FROM send_log WHERE sent_at >= datetime('now', '-' || ? || ' days') ORDER BY sent_at DESC", [String(days)])
  })
  ipcMain.handle('reports:stats', async () => {
    const db = await getDb()
    const total = (one(db, 'SELECT COUNT(*) as c FROM send_log') as any)?.c || 0
    const today = (one(db, "SELECT COUNT(*) as c FROM send_log WHERE date(sent_at) = date('now')") as any)?.c || 0
    const sent = (one(db, "SELECT COUNT(*) as c FROM send_log WHERE status = 'sent' AND date(sent_at) = date('now')") as any)?.c || 0
    const failed = (one(db, "SELECT COUNT(*) as c FROM send_log WHERE status = 'failed' AND date(sent_at) = date('now')") as any)?.c || 0
    return { total, today, todaySent: sent, todayFailed: failed }
  })

  // Settings
  ipcMain.handle('settings:get', async () => {
    const db = await getDb()
    const rows = all(db, 'SELECT key, value FROM settings') as { key: string; value: string }[]
    const s: Record<string, string> = {}
    for (const r of rows) s[r.key] = r.value
    return s
  })
  ipcMain.handle('settings:save', async (_, s: Record<string, string>) => {
    const db = await getDb()
    for (const [k, v] of Object.entries(s)) {
      run(db, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [k, v])
    }
    return { success: true }
  })

  ipcMain.handle('ai:config:get', () => getAiConfig())
  ipcMain.handle('ai:config:save', (_, input) => updateAiConfig(input))
  ipcMain.handle('ai:generate', (_, input) => generateAi(input))
  ipcMain.handle('ai:models', (_, provider) => listAiModels(provider))
  ipcMain.handle('ai:knowledge:list', () => listKnowledge())
  ipcMain.handle('ai:knowledge:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Contexto IA', extensions: ['txt', 'md', 'csv', 'json'] }] })
    if (result.canceled) return { success: false }
    let files: any[] = []
    for (const file of result.filePaths) { const imported = importKnowledge(file); if (!imported.success) return imported; files = imported.files || files }
    return { success: true, files }
  })
  ipcMain.handle('ai:knowledge:delete', (_, name) => deleteKnowledge(name))
  ipcMain.handle('external:open', (_, url: string) => {
    if (!/^https:\/\//i.test(url)) throw new Error('URL externa inválida')
    return shell.openExternal(url)
  })

  // Inbox
  ipcMain.handle('inbox:list', async (_, unreadOnly = false) => {
    const db = await getDb()
    if (unreadOnly) return all(db, 'SELECT * FROM inbox WHERE read = 0 ORDER BY received_at DESC')
    return all(db, 'SELECT * FROM inbox ORDER BY received_at DESC LIMIT 200')
  })
  ipcMain.handle('inbox:markRead', async (_, id: string) => {
    const db = await getDb()
    run(db, 'UPDATE inbox SET read = 1 WHERE id = ?', [id])
    return { success: true }
  })
  ipcMain.handle('inbox:markAllRead', async () => {
    const db = await getDb()
    run(db, 'UPDATE inbox SET read = 1 WHERE read = 0')
    return { success: true }
  })
  ipcMain.handle('inbox:unreadCount', async () => {
    const db = await getDb()
    const r = one(db, "SELECT COUNT(*) as c FROM inbox WHERE read = 0") as any
    return r?.c || 0
  })
  ipcMain.handle('inbox:conversationMeta', async () => {
    const db = await getDb()
    return all(db, 'SELECT * FROM inbox_conversations')
  })
  ipcMain.handle('inbox:saveConversationMeta', async (_, input: any) => {
    const db = await getDb()
    const current = one(db, 'SELECT * FROM inbox_conversations WHERE phone = ?', [input.phone]) as any
    const next = {
      status: input.status ?? current?.status ?? 'open',
      priority: input.priority ?? current?.priority ?? 'normal',
      pinned: input.pinned ?? current?.pinned ?? 0,
      tags: input.tags ?? current?.tags ?? '',
      notes: input.notes ?? current?.notes ?? '',
    }
    run(db, `INSERT INTO inbox_conversations (phone, status, priority, pinned, tags, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(phone) DO UPDATE SET status=excluded.status, priority=excluded.priority,
      pinned=excluded.pinned, tags=excluded.tags, notes=excluded.notes, updated_at=datetime('now')`,
      [input.phone, next.status, next.priority, next.pinned ? 1 : 0, next.tags, next.notes])
    return { phone: input.phone, ...next }
  })
}

app.whenReady().then(async () => {
  await getDb()
  registerIPC()
  createWindow()
  startScheduler()
  void restoreWA()
})

app.on('window-all-closed', () => {
  if (schedulerInterval) clearInterval(schedulerInterval)
  disconnectWA()
  app.quit()
})

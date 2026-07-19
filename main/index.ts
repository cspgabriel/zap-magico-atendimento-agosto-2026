import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { getDb, all, one, run } from '../shared/database'
import { connectWA, disconnectWA, unlinkWA, restoreWA, sendMessage, massSend, setMainWindow, interpolate, getAiAccessCandidates, getConnectionStatus } from './whatsapp'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { generateAi, getAiConfig, listAiModels, updateAiConfig } from './ai'
import { generateOpenRouterImage, generateOpenRouterSpeech, generateWhatsAppSpeech, getAiMediaUsage, listMediaModels, transcribeAudio } from './ai-media'
import { deleteKnowledge, importKnowledge, listKnowledge } from './knowledge'
import { setWarmupWindow, getWarmupPlans, listWarmupTasks, getWarmupLogs, getWarmupPairs, createWarmupTask, startWarmupTask, pauseWarmupTask, stopWarmupTask, resetWarmupTask, deleteWarmupTask } from './warmup'
import { getAgentApiConfig, restartAgentApi, stopAgentApi, updateAgentApiConfig } from './agent-api'

let mainWindow: BrowserWindow | null = null
let schedulerInterval: ReturnType<typeof setInterval> | null = null
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) app.quit()
else app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
})

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
  setWarmupWindow(mainWindow)
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
  ipcMain.handle('wa:connect', async (_, accountId = 'default') => { try { await connectWA(accountId); return { success: true } } catch (e: any) { return { success: false, error: e?.message || String(e) } } })
  ipcMain.handle('wa:disconnect', async (_, accountId = 'default') => disconnectWA(accountId))
  ipcMain.handle('wa:unlink', async (_, accountId = 'default') => unlinkWA(accountId))
  ipcMain.handle('wa:status', (_, accountId = 'default') => getConnectionStatus(accountId))
  ipcMain.handle('send:message', async (_, phone: string, message: string, accountId = 'default') => sendMessage(phone, message, accountId))
  ipcMain.handle('accounts:list', async () => {
    const db = await getDb()
    return all(db, 'SELECT * FROM whatsapp_accounts ORDER BY is_default DESC, created_at').map((row: any) => {
      const live = getConnectionStatus(row.id)
      return { ...row, ...live, status: live.status || (live.connected ? 'connected' : 'disconnected') }
    })
  })
  ipcMain.handle('accounts:create', async (_, name: string) => {
    const db = await getDb(); const id = uuidv4()
    run(db, 'INSERT INTO whatsapp_accounts (id, name) VALUES (?, ?)', [id, String(name || 'Nova conta').trim()])
    return { success: true, id }
  })
  ipcMain.handle('accounts:rename', async (_, id: string, name: string) => {
    const db = await getDb(); run(db, "UPDATE whatsapp_accounts SET name = ?, updated_at = datetime('now') WHERE id = ?", [String(name).trim(), id]); return { success: true }
  })
  ipcMain.handle('accounts:delete', async (_, id: string) => {
    if (id === 'default') return { success: false, error: 'A conta principal não pode ser excluída.' }
    await unlinkWA(id); const db = await getDb(); run(db, 'DELETE FROM whatsapp_accounts WHERE id = ?', [id]); return { success: true }
  })

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
  ipcMain.handle('campaigns:list', async (_, accountId = 'default') => {
    const db = await getDb()
    return all(db, 'SELECT * FROM campaigns WHERE account_id = ? ORDER BY created_at DESC', [accountId])
  })
  ipcMain.handle('campaigns:create', async (_, c: any) => {
    const db = await getDb()
    const id = uuidv4()
    const tpl = one(db, 'SELECT * FROM templates WHERE id = ?', [c.templateId]) as any
    const baseMessage = String(c.message || tpl?.message || '')

    const status = c.scheduled_at ? 'scheduled' : 'pending'
    run(db,
      `INSERT INTO campaigns (id, account_id, name, template_id, total_contacts, delay_min, delay_max, pause_every, pause_duration, daily_limit, status, scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, String(c.accountId || 'default'), c.name, c.templateId || null, c.contactIds.length,
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
  ipcMain.handle('agent-api:config:get', () => getAgentApiConfig())
  ipcMain.handle('agent-api:config:save', (_, input) => updateAgentApiConfig(input))

  ipcMain.handle('ai:config:get', (_, accountId = 'default') => getAiConfig(accountId))
  ipcMain.handle('ai:config:save', (_, accountId = 'default', input) => updateAiConfig(accountId, input))
  ipcMain.handle('ai:generate', (_, accountId = 'default', input) => generateAi({ ...input, accountId }))
  ipcMain.handle('ai:models', (_, accountId = 'default', provider) => listAiModels(provider, accountId))
  ipcMain.handle('ai:media:models', (_, accountId = 'default', kind, provider) => listMediaModels(kind, accountId, provider))
  ipcMain.handle('ai:media:image', (_, accountId = 'default', prompt, overrides) => generateOpenRouterImage(accountId, String(prompt || ''), overrides || {}))
  ipcMain.handle('ai:media:speech', (_, accountId = 'default', text, overrides) => generateOpenRouterSpeech(accountId, String(text || ''), overrides || {}))
  ipcMain.handle('ai:media:speech:whatsapp', (_, accountId = 'default', text, overrides) => generateWhatsAppSpeech(accountId, String(text || ''), overrides || {}))
  ipcMain.handle('ai:media:transcribe', (_, accountId = 'default', base64, format) => transcribeAudio(accountId, Buffer.from(String(base64 || ''), 'base64'), String(format || 'ogg')))
  ipcMain.handle('ai:media:usage', (_, accountId = 'default') => getAiMediaUsage(accountId))
  ipcMain.handle('ai:access:candidates', (_, accountId = 'default') => getAiAccessCandidates(accountId))
  ipcMain.handle('ai:knowledge:list', (_, accountId = 'default') => listKnowledge(accountId))
  ipcMain.handle('ai:knowledge:import', async (_, accountId = 'default') => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Contexto IA', extensions: ['txt', 'md', 'csv', 'json', 'html', 'htm', 'pdf', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'epub', 'png', 'jpg', 'jpeg', 'webp'] }] })
    if (result.canceled) return { success: false }
    let files: any[] = []
    for (const file of result.filePaths) { const imported = await importKnowledge(file, accountId); if (!imported.success) return imported; files = imported.files || files }
    return { success: true, files }
  })
  ipcMain.handle('ai:knowledge:delete', (_, accountId = 'default', name) => deleteKnowledge(name, accountId))
  ipcMain.handle('external:open', (_, url: string) => {
    if (!/^https:\/\//i.test(url)) throw new Error('URL externa inválida')
    return shell.openExternal(url)
  })

  // Inbox
  ipcMain.handle('inbox:list', async (_, unreadOnly = false, accountId = 'default') => {
    const db = await getDb()
    if (unreadOnly) return all(db, 'SELECT * FROM inbox WHERE account_id = ? AND read = 0 ORDER BY received_at DESC', [accountId])
    return all(db, 'SELECT * FROM inbox WHERE account_id = ? ORDER BY received_at DESC LIMIT 500', [accountId])
  })
  ipcMain.handle('inbox:markRead', async (_, id: string) => {
    const db = await getDb()
    run(db, 'UPDATE inbox SET read = 1 WHERE id = ?', [id])
    return { success: true }
  })
  ipcMain.handle('inbox:markAllRead', async (_, accountId = 'default') => {
    const db = await getDb()
    run(db, 'UPDATE inbox SET read = 1 WHERE account_id = ? AND read = 0', [accountId])
    return { success: true }
  })
  ipcMain.handle('inbox:unreadCount', async (_, accountId = 'default') => {
    const db = await getDb()
    const r = one(db, "SELECT COUNT(*) as c FROM inbox WHERE account_id = ? AND read = 0", [accountId]) as any
    return r?.c || 0
  })
  ipcMain.handle('inbox:conversationMeta', async (_, accountId = 'default') => {
    const db = await getDb()
    return all(db, 'SELECT * FROM conversations WHERE account_id = ?', [accountId])
  })
  ipcMain.handle('inbox:saveConversationMeta', async (_, input: any) => {
    const db = await getDb()
    const accountId = input.accountId || 'default'
    const current = one(db, 'SELECT * FROM conversations WHERE account_id = ? AND phone = ?', [accountId, input.phone]) as any
    const next = {
      status: input.status ?? current?.status ?? 'open',
      priority: input.priority ?? current?.priority ?? 'normal',
      pinned: input.pinned ?? current?.pinned ?? 0,
      tags: input.tags ?? current?.tags ?? '',
      notes: input.notes ?? current?.notes ?? '',
      assignee: input.assignee ?? current?.assignee ?? '',
      stage: input.stage ?? current?.stage ?? 'novo',
    }
    run(db, `INSERT INTO conversations (account_id, phone, status, priority, pinned, tags, notes, assignee, stage, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(account_id, phone) DO UPDATE SET status=excluded.status, priority=excluded.priority,
      pinned=excluded.pinned, tags=excluded.tags, notes=excluded.notes, assignee=excluded.assignee, stage=excluded.stage, updated_at=datetime('now')`,
      [accountId, input.phone, next.status, next.priority, next.pinned ? 1 : 0, next.tags, next.notes, next.assignee, next.stage])
    return { account_id: accountId, phone: input.phone, ...next }
  })

  ipcMain.handle('automations:list', async () => all(await getDb(), 'SELECT * FROM automation_rules ORDER BY enabled DESC, created_at DESC'))
  ipcMain.handle('automations:save', async (_, rule: any) => {
    const db = await getDb(); const id = rule.id || uuidv4()
    run(db, `INSERT INTO automation_rules (id,name,account_id,keyword,reply,add_tag,set_status,set_priority,enabled) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,account_id=excluded.account_id,keyword=excluded.keyword,reply=excluded.reply,add_tag=excluded.add_tag,set_status=excluded.set_status,set_priority=excluded.set_priority,enabled=excluded.enabled,updated_at=datetime('now')`,
      [id, rule.name, rule.account_id || '*', rule.keyword || '', rule.reply || '', rule.add_tag || '', rule.set_status || '', rule.set_priority || '', rule.enabled === false ? 0 : 1])
    return { success: true, id }
  })
  ipcMain.handle('automations:delete', async (_, id: string) => { const db = await getDb(); run(db, 'DELETE FROM automation_rules WHERE id = ?', [id]); return { success: true } })
  ipcMain.handle('deals:list', async (_, accountId = 'default') => all(await getDb(), 'SELECT * FROM deals WHERE account_id = ? ORDER BY updated_at DESC', [accountId]))
  ipcMain.handle('deals:save', async (_, deal: any) => {
    const db = await getDb(); const id = deal.id || uuidv4()
    run(db, `INSERT INTO deals (id,account_id,phone,title,value,stage,owner,notes) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET phone=excluded.phone,title=excluded.title,value=excluded.value,stage=excluded.stage,owner=excluded.owner,notes=excluded.notes,updated_at=datetime('now')`,
      [id, deal.account_id || 'default', deal.phone, deal.title, Number(deal.value || 0), deal.stage || 'novo', deal.owner || '', deal.notes || ''])
    return { success: true, id }
  })
  ipcMain.handle('deals:delete', async (_, id: string) => { const db = await getDb(); run(db, 'DELETE FROM deals WHERE id = ?', [id]); return { success: true } })

  // Aquecimento de Chips
  ipcMain.handle('warmup:plans', () => getWarmupPlans())
  ipcMain.handle('warmup:list', () => listWarmupTasks())
  ipcMain.handle('warmup:logs', (_, taskId: string, limit?: number) => getWarmupLogs(taskId, limit))
  ipcMain.handle('warmup:pairs', (_, taskId: string) => getWarmupPairs(taskId))
  ipcMain.handle('warmup:create', (_, input: any) => createWarmupTask(input))
  ipcMain.handle('warmup:start', (_, taskId: string) => startWarmupTask(taskId))
  ipcMain.handle('warmup:pause', (_, taskId: string) => pauseWarmupTask(taskId))
  ipcMain.handle('warmup:stop', (_, taskId: string) => stopWarmupTask(taskId))
  ipcMain.handle('warmup:reset', (_, taskId: string) => resetWarmupTask(taskId))
  ipcMain.handle('warmup:delete', (_, taskId: string) => deleteWarmupTask(taskId))
}

if (hasSingleInstanceLock) app.whenReady().then(async () => {
  await getDb()
  registerIPC()
  createWindow()
  startScheduler()
  void restartAgentApi()
  void restoreWA()
})

app.on('window-all-closed', () => {
  if (schedulerInterval) clearInterval(schedulerInterval)
  void stopAgentApi()
  disconnectWA()
  app.quit()
})

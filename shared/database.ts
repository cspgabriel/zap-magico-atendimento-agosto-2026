import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: SqlJsDatabase

function migrate(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      status TEXT DEFAULT 'disconnected',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_session_store (
      account_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (account_id, file_name)
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_groups (
      account_id TEXT NOT NULL,
      jid TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      participant_count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (account_id, jid)
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_group_members (
      account_id TEXT NOT NULL,
      group_jid TEXT NOT NULL,
      member_id TEXT NOT NULL,
      phone_number TEXT DEFAULT '',
      lid TEXT DEFAULT '',
      name TEXT DEFAULT '',
      is_admin INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (account_id, group_jid, member_id)
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS ai_media_log (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      model TEXT DEFAULT '',
      target TEXT DEFAULT '',
      status TEXT NOT NULL,
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      group_name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_id TEXT,
      total_contacts INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      delay_min INTEGER DEFAULT 10,
      delay_max INTEGER DEFAULT 30,
      pause_every INTEGER DEFAULT 50,
      pause_duration INTEGER DEFAULT 60,
      daily_limit INTEGER DEFAULT 500,
      created_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT,
      scheduled_at TEXT
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS campaign_messages (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      sent_at TEXT
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS send_log (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      contact_name TEXT,
      message TEXT,
      status TEXT NOT NULL,
      error TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS inbox (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      message TEXT NOT NULL,
      from_me INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      source_jid TEXT DEFAULT '',
      sender_id TEXT DEFAULT '',
      sender_name TEXT DEFAULT '',
      received_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS inbox_conversations (
      phone TEXT PRIMARY KEY,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      pinned INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      account_id TEXT NOT NULL DEFAULT 'default',
      phone TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      pinned INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      assignee TEXT DEFAULT '',
      stage TEXT DEFAULT 'novo',
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (account_id, phone)
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_id TEXT DEFAULT '*',
      keyword TEXT DEFAULT '',
      reply TEXT DEFAULT '',
      add_tag TEXT DEFAULT '',
      set_status TEXT DEFAULT '',
      set_priority TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      executions INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL DEFAULT 'default',
      phone TEXT NOT NULL,
      title TEXT NOT NULL,
      value REAL DEFAULT 0,
      stage TEXT DEFAULT 'novo',
      owner TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS warmup_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT '14',
      status TEXT NOT NULL DEFAULT 'idle',
      current_day INTEGER DEFAULT 0,
      conversations_today INTEGER DEFAULT 0,
      target_today INTEGER DEFAULT 0,
      started_at TEXT,
      last_run_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS warmup_log (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL,
      message TEXT,
      topic TEXT,
      day INTEGER,
      hour INTEGER,
      sent_at TEXT DEFAULT (datetime('now'))
    )`)
  database.run(`
    CREATE TABLE IF NOT EXISTS warmup_pairs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      source_phone TEXT NOT NULL,
      target_phone TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`)

  const inboxColumns = database.exec('PRAGMA table_info(inbox)')[0]?.values.map((v: any) => v[1]) || []
  if (!inboxColumns.includes('source_jid')) database.run("ALTER TABLE inbox ADD COLUMN source_jid TEXT DEFAULT ''")
  if (!inboxColumns.includes('account_id')) database.run("ALTER TABLE inbox ADD COLUMN account_id TEXT DEFAULT 'default'")
  if (!inboxColumns.includes('sender_id')) database.run("ALTER TABLE inbox ADD COLUMN sender_id TEXT DEFAULT ''")
  if (!inboxColumns.includes('sender_name')) database.run("ALTER TABLE inbox ADD COLUMN sender_name TEXT DEFAULT ''")
  const sendLogColumns = database.exec('PRAGMA table_info(send_log)')[0]?.values.map((v: any) => v[1]) || []
  if (!sendLogColumns.includes('account_id')) database.run("ALTER TABLE send_log ADD COLUMN account_id TEXT DEFAULT 'default'")
  database.run("INSERT OR IGNORE INTO whatsapp_accounts (id, name, is_default) VALUES ('default', 'WhatsApp principal', 1)")
  database.run(`INSERT OR IGNORE INTO conversations (account_id, phone, status, priority, pinned, tags, notes, updated_at)
    SELECT 'default', phone, status, priority, pinned, tags, notes, updated_at FROM inbox_conversations`)
  database.run("DELETE FROM inbox WHERE id = '3AC781DE41A6A2B571AF'")

  const retiredBonusTemplates = [
    'Abandono de Checkout', 'Boas-vindas Pós-Venda', 'Boleto Vencendo Amanhã', 'Cartão Recusado',
    'Conteúdo de Valor', 'Convite para Grupo VIP', 'Entrega de Isca Digital', 'Feedback Ativo',
    'Gancho de Curiosidade', 'Lançamento Oficial', 'Lembrete de Reunião / Live', 'Oferta Relâmpago 24h',
    'Oportunidade Downsell', 'Pesquisa NPS', 'Pesquisa de Perfil', 'Pix Gerado',
    'Renovação de Assinatura', 'Suporte Resolvido', 'Up-sell / Upgrade de Plano', 'Última Chance',
  ]
  database.run(`DELETE FROM templates WHERE name IN (${retiredBonusTemplates.map(() => '?').join(',')})`, retiredBonusTemplates)

  const colCheck = database.exec("PRAGMA table_info(campaigns)")
  const cols = colCheck[0]?.values.map((v: any) => v[1]) || []
  if (!cols.includes('scheduled_at')) {
    database.run("ALTER TABLE campaigns ADD COLUMN scheduled_at TEXT")
  }
  if (!cols.includes('account_id')) database.run("ALTER TABLE campaigns ADD COLUMN account_id TEXT DEFAULT 'default'")

  const row = database.exec("SELECT COUNT(*) as c FROM settings")
  const hasSettings = row.length > 0 && row[0].values.length > 0 && Number(row[0].values[0][0]) > 0
  if (!hasSettings) {
    const insert = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    for (const [k, v] of Object.entries({
      delay_min: '10', delay_max: '30', pause_every: '50',
      pause_duration: '60', daily_limit: '500', wa_instance_name: 'zapmagico',
    })) {
      insert.bind([k, v])
      insert.step()
      insert.reset()
    }
    insert.free()
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function persist() {
  if (!db) return
  try {
    const data = db.export()
    fs.writeFileSync(path.join(app.getPath('userData'), 'zapmagico.db'), Buffer.from(data))
  } catch (_) {}
}

function autoPersist() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(persist, 300)
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db
  const SQL = await initSqlJs()
  const dbPath = path.join(app.getPath('userData'), 'zapmagico.db')
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }
  migrate(db)
  persist()
  return db
}

export function all(database: SqlJsDatabase, sql: string, params?: any[]): any[] {
  const stmt = database.prepare(sql)
  if (params) stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  autoPersist()
  return rows
}

export function one(database: SqlJsDatabase, sql: string, params?: any[]): any | null {
  const rows = all(database, sql, params)
  return rows[0] || null
}

export function run(database: SqlJsDatabase, sql: string, params?: any[]): void {
  database.run(sql, params)
  autoPersist()
}

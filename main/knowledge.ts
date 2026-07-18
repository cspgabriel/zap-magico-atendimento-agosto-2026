import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const allowed = new Set(['.txt', '.md', '.csv', '.json'])
function root(accountId = 'default') {
  const base = path.join(app.getPath('userData'), 'ai-knowledge')
  const dir = accountId === 'default' ? base : path.join(base, 'accounts', safeName(accountId))
  fs.mkdirSync(dir, { recursive: true }); return dir
}
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '_') }

export function listKnowledge(accountId = 'default') {
  return fs.readdirSync(root(accountId)).filter(name => allowed.has(path.extname(name).toLowerCase())).map(name => {
    const stat = fs.statSync(path.join(root(accountId), name))
    return { name, size: stat.size, updatedAt: stat.mtime.toISOString() }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function importKnowledge(filePath: string, accountId = 'default') {
  const ext = path.extname(filePath).toLowerCase()
  if (!allowed.has(ext)) return { success: false, error: 'Use TXT, MD, CSV ou JSON nesta versão local.' }
  const target = path.join(root(accountId), safeName(path.basename(filePath)))
  fs.copyFileSync(filePath, target)
  return { success: true, files: listKnowledge(accountId) }
}

export function deleteKnowledge(name: string, accountId = 'default') {
  const target = path.join(root(accountId), safeName(name))
  if (fs.existsSync(target)) fs.unlinkSync(target)
  return listKnowledge(accountId)
}

export function readKnowledgeContext(accountId = 'default', maxChars = 18000) {
  let context = ''
  for (const file of listKnowledge(accountId)) {
    const content = fs.readFileSync(path.join(root(accountId), file.name), 'utf8')
    context += `\n\n[Arquivo: ${file.name}]\n${content.slice(0, Math.max(0, maxChars - context.length))}`
    if (context.length >= maxChars) break
  }
  return context
}

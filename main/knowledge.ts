import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const allowed = new Set(['.txt', '.md', '.csv', '.json'])
function root() { const dir = path.join(app.getPath('userData'), 'ai-knowledge'); fs.mkdirSync(dir, { recursive: true }); return dir }
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '_') }

export function listKnowledge() {
  return fs.readdirSync(root()).filter(name => allowed.has(path.extname(name).toLowerCase())).map(name => {
    const stat = fs.statSync(path.join(root(), name))
    return { name, size: stat.size, updatedAt: stat.mtime.toISOString() }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function importKnowledge(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (!allowed.has(ext)) return { success: false, error: 'Use TXT, MD, CSV ou JSON nesta versão local.' }
  const target = path.join(root(), safeName(path.basename(filePath)))
  fs.copyFileSync(filePath, target)
  return { success: true, files: listKnowledge() }
}

export function deleteKnowledge(name: string) {
  const target = path.join(root(), safeName(name))
  if (fs.existsSync(target)) fs.unlinkSync(target)
  return listKnowledge()
}

export function readKnowledgeContext(maxChars = 18000) {
  let context = ''
  for (const file of listKnowledge()) {
    const content = fs.readFileSync(path.join(root(), file.name), 'utf8')
    context += `\n\n[Arquivo: ${file.name}]\n${content.slice(0, Math.max(0, maxChars - context.length))}`
    if (context.length >= maxChars) break
  }
  return context
}

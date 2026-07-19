import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { OfficeParser } from 'officeparser'

const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.html', '.htm'])
const documentExtensions = new Set(['.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.rtf', '.epub'])
const imageTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const allowed = new Set([...textExtensions, ...documentExtensions, ...Object.keys(imageTypes)])
function root(accountId = 'default') {
  const base = path.join(app.getPath('userData'), 'ai-knowledge')
  const dir = accountId === 'default' ? base : path.join(base, 'accounts', safeName(accountId))
  fs.mkdirSync(dir, { recursive: true }); return dir
}
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '_') }
function extractedRoot(accountId = 'default') { const dir = path.join(root(accountId), '.extracted'); fs.mkdirSync(dir, { recursive: true }); return dir }
function extractedPath(name: string, accountId = 'default') { return path.join(extractedRoot(accountId), `${safeName(name)}.txt`) }

export function listKnowledge(accountId = 'default') {
  return fs.readdirSync(root(accountId)).filter(name => allowed.has(path.extname(name).toLowerCase())).map(name => {
    const stat = fs.statSync(path.join(root(accountId), name))
    const ext = path.extname(name).toLowerCase()
    return { name, size: stat.size, updatedAt: stat.mtime.toISOString(), kind: imageTypes[ext] ? 'image' : documentExtensions.has(ext) ? 'document' : 'text', mimeType: imageTypes[ext] || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream') }
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function importKnowledge(filePath: string, accountId = 'default') {
  const ext = path.extname(filePath).toLowerCase()
  if (!allowed.has(ext)) return { success: false, error: 'Formato não aceito. Use imagens, PDF, DOCX, XLSX, PPTX, ODT/ODS/ODP, RTF, EPUB, HTML, TXT, MD, CSV ou JSON.' }
  if (imageTypes[ext] && fs.statSync(filePath).size > 8 * 1024 * 1024) return { success: false, error: 'Cada imagem de referência deve ter no máximo 8 MB.' }
  if (documentExtensions.has(ext) && fs.statSync(filePath).size > 25 * 1024 * 1024) return { success: false, error: 'Cada documento deve ter no máximo 25 MB.' }
  const target = path.join(root(accountId), safeName(path.basename(filePath)))
  fs.copyFileSync(filePath, target)
  if (documentExtensions.has(ext)) {
    try {
      const ast = await OfficeParser.parseOffice(target)
      fs.writeFileSync(extractedPath(path.basename(target), accountId), ast.toText(), 'utf8')
    } catch (error: any) {
      fs.unlinkSync(target)
      return { success: false, error: `Não foi possível ler ${path.basename(filePath)}: ${error?.message || 'documento inválido ou protegido'}` }
    }
  }
  return { success: true, files: listKnowledge(accountId) }
}

export function deleteKnowledge(name: string, accountId = 'default') {
  const target = path.join(root(accountId), safeName(name))
  if (fs.existsSync(target)) fs.unlinkSync(target)
  const extracted = extractedPath(name, accountId)
  if (fs.existsSync(extracted)) fs.unlinkSync(extracted)
  return listKnowledge(accountId)
}

export function readKnowledgeContext(accountId = 'default', maxChars = 18000) {
  let context = ''
  for (const file of listKnowledge(accountId)) {
    if (file.kind === 'image') continue
    const source = file.kind === 'document' ? extractedPath(file.name, accountId) : path.join(root(accountId), file.name)
    if (!fs.existsSync(source)) continue
    const content = fs.readFileSync(source, 'utf8')
    context += `\n\n[Arquivo: ${file.name}]\n${content.slice(0, Math.max(0, maxChars - context.length))}`
    if (context.length >= maxChars) break
  }
  return context
}

export function getKnowledgeImageReferences(accountId = 'default', maxReferences = 16) {
  const images = listKnowledge(accountId).filter(file => file.kind === 'image').slice(0, Math.max(0, maxReferences))
  let totalBytes = 0
  const references: Array<{ type: 'image_url'; image_url: { url: string }; name: string }> = []
  for (const file of images) {
    if (totalBytes + file.size > 32 * 1024 * 1024) break
    const bytes = fs.readFileSync(path.join(root(accountId), file.name))
    totalBytes += bytes.length
    references.push({ type: 'image_url', image_url: { url: `data:${file.mimeType};base64,${bytes.toString('base64')}` }, name: file.name })
  }
  return references
}

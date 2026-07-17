import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { readKnowledgeContext, listKnowledge } from './knowledge'

export type AiProvider = 'auto' | 'openrouter' | 'gemini' | 'openai' | 'deepseek'

type StoredConfig = {
  provider?: AiProvider
  models?: Partial<Record<Exclude<AiProvider, 'auto'>, string>>
  keys?: Partial<Record<Exclude<AiProvider, 'auto'>, string>>
  systemPrompt?: string
}

const defaults = {
  openrouter: 'openai/gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
}

function configPath() {
  return path.join(app.getPath('userData'), 'ai-config.json')
}

function readHermesEnv() {
  const envPath = path.join(app.getPath('documents'), 'CLAUDE CODE', 'hermes-agente-gabriel', 'hermes', 'credenciais', 'hermes.env')
  if (!fs.existsSync(envPath)) return {} as Record<string, string>
  const result: Record<string, string> = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
  return result
}

function loadConfig(): StoredConfig {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as StoredConfig
    if (parsed.keys && safeStorage.isEncryptionAvailable()) {
      for (const provider of Object.keys(parsed.keys) as Array<Exclude<AiProvider, 'auto'>>) {
        const encrypted = parsed.keys[provider]
        if (encrypted) parsed.keys[provider] = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      }
    }
    return parsed
  } catch { return {} }
}

function saveConfig(config: StoredConfig) {
  const output: StoredConfig = { ...config, keys: { ...config.keys } }
  if (output.keys && safeStorage.isEncryptionAvailable()) {
    for (const provider of Object.keys(output.keys) as Array<Exclude<AiProvider, 'auto'>>) {
      const key = output.keys[provider]
      if (key) output.keys[provider] = safeStorage.encryptString(key).toString('base64')
    }
  }
  fs.writeFileSync(configPath(), JSON.stringify(output, null, 2), 'utf8')
}

function providerKey(provider: Exclude<AiProvider, 'auto'>, config: StoredConfig) {
  if (config.keys?.[provider]) return config.keys[provider]
  const hermes = readHermesEnv()
  const names = {
    openrouter: 'OPENROUTER_API_KEY', gemini: 'GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY', deepseek: 'DEEPSEEK_API_KEY',
  }
  return process.env[names[provider]] || hermes[names[provider]] || ''
}

async function compatibleRequest(provider: 'openrouter' | 'openai' | 'deepseek', key: string, model: string, prompt: string) {
  const urls = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
  }
  const response = await fetch(urls[provider], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 700 }),
  })
  if (!response.ok) throw new Error(`${provider}: HTTP ${response.status}`)
  const data = await response.json() as any
  return String(data.choices?.[0]?.message?.content || '').trim()
}

async function geminiRequest(key: string, model: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 700 } }),
  })
  if (!response.ok) throw new Error(`gemini: HTTP ${response.status}`)
  const data = await response.json() as any
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
}

export function getAiConfig() {
  const config = loadConfig()
  const providers = (['openrouter', 'gemini', 'openai', 'deepseek'] as const).map((id) => ({
    id, configured: Boolean(providerKey(id, config)), model: config.models?.[id] || defaults[id],
  }))
  return { provider: config.provider || 'auto', providers, systemPrompt: config.systemPrompt || '', knowledge: listKnowledge() }
}

export function updateAiConfig(input: { provider?: AiProvider; id?: Exclude<AiProvider, 'auto'>; key?: string; model?: string; systemPrompt?: string }) {
  const config = loadConfig()
  if (input.provider) config.provider = input.provider
  if (input.id) {
    config.models = { ...config.models, ...(input.model ? { [input.id]: input.model } : {}) }
    config.keys = { ...config.keys, ...(input.key ? { [input.id]: input.key.trim() } : {}) }
  }
  if (input.systemPrompt !== undefined) config.systemPrompt = input.systemPrompt
  saveConfig(config)
  return getAiConfig()
}

export async function listAiModels(provider: Exclude<AiProvider, 'auto'>) {
  const config = loadConfig()
  const key = providerKey(provider, config)
  const endpoints = {
    openrouter: 'https://openrouter.ai/api/v1/models',
    openai: 'https://api.openai.com/v1/models',
    deepseek: 'https://api.deepseek.com/models',
    gemini: `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(key)}`,
  }
  if (provider !== 'openrouter' && !key) return { success: false, models: [], error: 'Configure a chave API primeiro.' }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (provider !== 'gemini' && key) headers.Authorization = `Bearer ${key}`
  try {
    const response = await fetch(endpoints[provider], { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as any
    const models = provider === 'gemini'
      ? (data.models || []).filter((m: any) => m.supportedGenerationMethods?.includes('generateContent')).map((m: any) => ({ id: String(m.name).replace(/^models\//, ''), name: m.displayName || m.name }))
      : (data.data || []).map((m: any) => ({ id: m.id, name: m.name || m.id }))
    models.sort((a: any, b: any) => a.name.localeCompare(b.name))
    return { success: true, models }
  } catch (error: any) {
    return { success: false, models: [], error: `${provider}: ${error.message}` }
  }
}

export async function generateAi(input: { text: string; action?: string; provider?: AiProvider }) {
  const config = loadConfig()
  const selected = input.provider || config.provider || 'auto'
  const order: Array<Exclude<AiProvider, 'auto'>> = selected === 'auto'
    ? ['openrouter', 'gemini', 'openai', 'deepseek'] : [selected]
  const instructions: Record<string, string> = {
    create: 'Crie uma mensagem de WhatsApp clara, humana e pronta para envio.',
    improve: 'Melhore esta mensagem de WhatsApp, mantendo a intenção e deixando mais natural.',
    shorten: 'Encurte esta mensagem sem perder informações importantes.',
    sales: 'Reescreva com persuasão ética, clareza e um CTA natural, sem pressão excessiva.',
    support: 'Reescreva em tom acolhedor, objetivo e profissional de atendimento ao cliente.',
    reply: 'Gere uma resposta de atendimento para a conversa abaixo. Seja humano, útil e objetivo. Não invente informações; quando faltar contexto, faça uma pergunta curta.',
  }
  const knowledge = readKnowledgeContext()
  const prompt = `${instructions[input.action || 'create'] || instructions.create}\nUse português do Brasil. Não invente preço, prazo, política ou característica. Se a base não trouxer a resposta, sinalize a dúvida ao atendente. Não explique o que fez. Entregue somente a mensagem final.\n\nInstruções da operação:\n${config.systemPrompt || 'Atenda com clareza, cordialidade e objetividade.'}\n\nBase local de conhecimento:\n${knowledge || '(nenhum arquivo cadastrado)'}\n\nConteúdo:\n${input.text}`
  const errors: string[] = []
  for (const provider of order) {
    const key = providerKey(provider, config)
    if (!key) { errors.push(`${provider}: não configurado`); continue }
    try {
      const model = config.models?.[provider] || defaults[provider]
      const result = provider === 'gemini'
        ? await geminiRequest(key, model, prompt)
        : await compatibleRequest(provider, key, model, prompt)
      if (result) return { success: true, text: result, provider, model }
    } catch (error: any) { errors.push(error.message) }
  }
  return { success: false, error: errors.join(' | ') || 'Nenhum provedor configurado.' }
}

import { app } from 'electron'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import { all, getDb, one, run } from '../shared/database'
import { getAiMediaConfig, providerKeyForAccount } from './ai'

export type AiMediaKind = 'image' | 'voice'

function openRouterHeaders(accountId: string) {
  const key = providerKeyForAccount('openrouter', accountId)
  return { Accept: 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }
}

function isFreePricing(model: any) {
  const pricing = model.pricing || {}
  const values = [pricing.prompt, pricing.completion, pricing.request, pricing.output_image, pricing.output_audio]
    .filter(value => value !== undefined && value !== null)
    .map(Number)
  return String(model.id || '').endsWith(':free') || String(model.id || '') === 'openrouter/free' || (values.length > 0 && values.every(value => value === 0))
}

export async function listOpenRouterMediaModels(kind: AiMediaKind, accountId = 'default') {
  const url = kind === 'image'
    ? 'https://openrouter.ai/api/v1/images/models'
    : 'https://openrouter.ai/api/v1/models?output_modalities=speech'
  try {
    const response = await fetch(url, { headers: openRouterHeaders(accountId) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json() as any
    const models = (payload.data || []).map((model: any) => ({
      id: String(model.id || ''),
      name: String(model.name || model.id || ''),
      description: String(model.description || ''),
      contextLength: Number(model.context_length || model.top_provider?.context_length || 0),
      inputModalities: model.architecture?.input_modalities || [],
      outputModalities: model.architecture?.output_modalities || [],
      supportedParameters: Array.isArray(model.supported_parameters) ? model.supported_parameters : Object.keys(model.supported_parameters || {}),
      supportedVoices: Array.isArray(model.supported_voices) ? model.supported_voices : [],
      promptPrice: Number(model.pricing?.prompt || 0),
      completionPrice: Number(model.pricing?.completion || 0),
      isFree: isFreePricing(model),
    })).filter((model: any) => model.id)
    models.sort((a: any, b: any) => a.name.localeCompare(b.name))
    return { success: true, models }
  } catch (error: any) {
    return { success: false, models: [], error: `OpenRouter: ${error?.message || 'falha ao carregar modelos'}` }
  }
}

async function enforceDailyLimit(accountId: string, kind: AiMediaKind) {
  const config = getAiMediaConfig(accountId)
  const limit = kind === 'image' ? config.imageDailyLimit : config.voiceDailyLimit
  const db = await getDb()
  const row = one(db, `SELECT COUNT(*) AS total FROM ai_media_log WHERE account_id = ? AND kind = ? AND status = 'generated' AND date(created_at) = date('now')`, [accountId, kind]) as any
  const used = Number(row?.total || 0)
  if (used >= limit) throw new Error(`Limite diário de ${kind === 'image' ? 'imagens' : 'áudios'} atingido (${limit}).`)
  return { used, limit }
}

async function logMedia(accountId: string, kind: AiMediaKind, model: string, status: string, error = '', target = '') {
  const db = await getDb()
  run(db, 'INSERT INTO ai_media_log (id,account_id,kind,model,target,status,error) VALUES (?,?,?,?,?,?,?)', [crypto.randomUUID(), accountId, kind, model, target, status, error])
}

export async function getAiMediaUsage(accountId = 'default') {
  const db = await getDb()
  const rows = all(db, `SELECT kind,COUNT(*) AS total FROM ai_media_log WHERE account_id = ? AND status = 'generated' AND date(created_at) = date('now') GROUP BY kind`, [accountId]) as any[]
  const totals = Object.fromEntries(rows.map(row => [row.kind, Number(row.total || 0)]))
  const config = getAiMediaConfig(accountId)
  return { image: totals.image || 0, voice: totals.voice || 0, imageLimit: config.imageDailyLimit, voiceLimit: config.voiceDailyLimit }
}

export async function generateOpenRouterImage(accountId: string, prompt: string, overrides: Record<string, any> = {}) {
  const config = getAiMediaConfig(accountId)
  const model = String(overrides.model || config.imageModel)
  if (!prompt.trim()) return { success: false, error: 'Informe a descrição da imagem.' }
  const key = providerKeyForAccount('openrouter', accountId)
  if (!key) return { success: false, error: 'Configure a chave OpenRouter nesta conta.' }
  try {
    await enforceDailyLimit(accountId, 'image')
    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: prompt.trim(),
        n: 1,
        aspect_ratio: overrides.aspectRatio || config.imageAspectRatio,
        resolution: overrides.resolution || config.imageResolution,
        quality: overrides.quality || config.imageQuality,
        output_format: 'png',
      }),
    })
    if (!response.ok) {
      const detail = String(await response.text()).slice(0, 500)
      throw new Error(`HTTP ${response.status}${detail ? ` · ${detail}` : ''}`)
    }
    const payload = await response.json() as any
    const image = payload.data?.[0]
    if (!image?.b64_json) throw new Error('O modelo não retornou uma imagem.')
    const mediaType = String(image.media_type || 'image/png')
    await logMedia(accountId, 'image', model, 'generated')
    return { success: true, base64: String(image.b64_json), mediaType, model, usage: payload.usage || null }
  } catch (error: any) {
    await logMedia(accountId, 'image', model, 'failed', error?.message || String(error))
    return { success: false, error: `Imagem: ${error?.message || 'falha na geração'}` }
  }
}

export async function generateOpenRouterSpeech(accountId: string, text: string, overrides: Record<string, any> = {}) {
  const config = getAiMediaConfig(accountId)
  const model = String(overrides.model || config.voiceModel)
  const voice = String(overrides.voice || config.voiceName)
  if (!text.trim()) return { success: false, error: 'Informe o texto do áudio.' }
  const key = providerKeyForAccount('openrouter', accountId)
  if (!key) return { success: false, error: 'Configure a chave OpenRouter nesta conta.' }
  try {
    await enforceDailyLimit(accountId, 'voice')
    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text.trim(), voice, response_format: 'mp3', speed: Number(overrides.speed || config.voiceSpeed) }),
    })
    if (!response.ok) {
      const detail = String(await response.text()).slice(0, 500)
      throw new Error(`HTTP ${response.status}${detail ? ` · ${detail}` : ''}`)
    }
    const audio = Buffer.from(await response.arrayBuffer())
    if (!audio.length) throw new Error('O modelo não retornou áudio.')
    await logMedia(accountId, 'voice', model, 'generated')
    return { success: true, base64: audio.toString('base64'), mediaType: response.headers.get('content-type') || 'audio/mpeg', model, voice }
  } catch (error: any) {
    await logMedia(accountId, 'voice', model, 'failed', error?.message || String(error))
    return { success: false, error: `Voz: ${error?.message || 'falha na geração'}` }
  }
}

function packagedFfmpegPath() {
  const raw = String(ffmpegStatic || 'ffmpeg')
  return app.isPackaged ? raw.replace('app.asar', 'app.asar.unpacked') : raw
}

export function convertMp3ToWhatsAppOpus(input: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    const process = spawn(packagedFfmpegPath(), ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg', 'pipe:1'], { windowsHide: true })
    const output: Buffer[] = []
    const errors: Buffer[] = []
    process.stdout.on('data', chunk => output.push(Buffer.from(chunk)))
    process.stderr.on('data', chunk => errors.push(Buffer.from(chunk)))
    process.on('error', reject)
    process.on('close', code => code === 0 && output.length ? resolve(Buffer.concat(output)) : reject(new Error(Buffer.concat(errors).toString('utf8') || `FFmpeg encerrou com código ${code}`)))
    process.stdin.end(input)
  })
}

export function detectAiMediaIntent(text: string, accountId = 'default') {
  const config = getAiMediaConfig(accountId)
  const value = String(text || '').trim()
  const normalized = value.toLowerCase()
  const imageRequest = /^(?:\/)?(?:foto|imagem)\b[:\s-]*/i.test(value) || /\b(?:gere|crie|faça|manda|envie)\b.{0,24}\b(?:foto|imagem)\b/i.test(normalized)
  const voiceRequest = /^(?:\/)?(?:audio|áudio|voz)\b[:\s-]*/i.test(value) || /\b(?:mande|envie|responda|fala|fale)\b.{0,24}\b(?:áudio|audio|voz)\b/i.test(normalized)
  if (config.imageEnabled && imageRequest) return { kind: 'image' as const, prompt: value.replace(/^(?:\/)?(?:foto|imagem)\b[:\s-]*/i, '').trim() || value }
  if (config.voiceEnabled && (config.voiceReplyMode === 'always' || voiceRequest)) return { kind: 'voice' as const, prompt: value.replace(/^(?:\/)?(?:audio|áudio|voz)\b[:\s-]*/i, '').trim() || value }
  return { kind: 'text' as const, prompt: value }
}

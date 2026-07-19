import { app } from 'electron'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import { all, getDb, one, run } from '../shared/database'
import { getAiMediaConfig, mediaProviderKey, providerKeyForAccount } from './ai'
import { getKnowledgeImageReferences } from './knowledge'

export type AiMediaKind = 'image' | 'voice' | 'transcription'

function openRouterHeaders(accountId: string, kind?: AiMediaKind) {
  const key = kind ? mediaProviderKey(accountId, kind, 'openrouter') : providerKeyForAccount('openrouter', accountId)
  return { Accept: 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }
}

function isFreePricing(model: any) {
  const pricing = model.pricing || {}
  const values = [pricing.prompt, pricing.completion, pricing.request, pricing.output_image, pricing.output_audio]
    .filter(value => value !== undefined && value !== null)
    .map(Number)
  return String(model.id || '').endsWith(':free') || String(model.id || '') === 'openrouter/free' || (values.length > 0 && values.every(value => value === 0))
}

let mediaModelCache: Record<string, { expires: number; value: any }> = {}

function voiceGender(id: string) {
  const value = id.toLowerCase()
  if (/^(?:a|b|e|f|h|i|j|p|z)f_/.test(value) || value.includes('female')) return 'female'
  if (/^(?:a|b|e|h|i|j|p|z)m_/.test(value) || value.includes('male')) return 'male'
  const female = new Set(['tara', 'leah', 'jess', 'mia', 'gb_jane_sarcasm', 'gb_jane_confused', 'gb_jane_shameful', 'gb_jane_sad', 'gb_jane_neutral', 'gb_jane_jealousy', 'gb_jane_frustrated', 'gb_jane_curious', 'gb_jane_confident', 'fr_marie_sad', 'fr_marie_neutral', 'fr_marie_happy', 'fr_marie_excited', 'fr_marie_curious', 'fr_marie_angry'])
  const male = new Set(['leo', 'dan', 'zac', 'en_paul_sad', 'en_paul_neutral', 'en_paul_happy', 'en_paul_frustrated', 'en_paul_excited', 'en_paul_confident', 'en_paul_cheerful', 'en_paul_angry', 'gb_oliver_neutral', 'gb_oliver_sad', 'gb_oliver_excited', 'gb_oliver_curious', 'gb_oliver_confident', 'gb_oliver_cheerful', 'gb_oliver_angry'])
  return female.has(value) ? 'female' : male.has(value) ? 'male' : 'unknown'
}

function voiceLocale(id: string, modelId: string) {
  const value = id.toLowerCase()
  if (modelId === 'hexgrad/kokoro-82m' && /^(pf|pm)_/.test(value)) return 'pt-BR'
  if (modelId.startsWith('google/gemini-') && modelId.includes('tts')) return 'multilíngue · inclui pt-BR'
  const suffix = value.match(/-(en|es|fr|de|it|ja|nl)(?:-|$)/)?.[1]
  return suffix || 'não informado'
}

async function imageEndpointPricing(models: any[], headers: Record<string, string>) {
  const output = new Map<string, any[]>()
  for (let index = 0; index < models.length; index += 8) {
    await Promise.all(models.slice(index, index + 8).map(async model => {
      if (!model.endpoints) return
      try {
        const response = await fetch(new URL(model.endpoints, 'https://openrouter.ai').toString(), { headers })
        if (!response.ok) return
        const payload = await response.json() as any
        const lines = (payload.endpoints || []).flatMap((endpoint: any) => (endpoint.pricing || []).map((price: any) => ({ provider: endpoint.provider_name || endpoint.provider_slug || '', billable: String(price.billable || ''), unit: String(price.unit || ''), costUsd: Number(price.cost_usd || 0), variant: String(price.variant || '') })))
        output.set(model.id, lines)
      } catch {}
    }))
  }
  return output
}

export async function listMediaModels(kind: AiMediaKind, accountId = 'default', requestedProvider?: string) {
  const config = getAiMediaConfig(accountId) as any
  const provider = requestedProvider || config[`${kind}Provider`] || 'openrouter'
  const cacheKey = `${provider}:${kind}`
  const cached = mediaModelCache[cacheKey]
  if (cached && cached.expires > Date.now()) return cached.value
  if (provider === 'openai') {
    const key = mediaProviderKey(accountId, kind, 'openai')
    if (!key) return { success: false, models: [], error: 'Configure ou reutilize uma chave OpenAI.' }
    const imagePricing: Record<string, { input: number; output: number; low: number }> = { 'gpt-image-2': { input: 0, output: 0, low: 0 }, 'gpt-image-1.5': { input: 8, output: 32, low: .009 }, 'gpt-image-1': { input: 10, output: 40, low: .011 }, 'gpt-image-1-mini': { input: 2.5, output: 8, low: .005 } }
    const voicePricing: Record<string, { input: number; output: number; unit?: string }> = { 'gpt-4o-mini-tts': { input: .6, output: 12 }, 'tts-1': { input: 15, output: 0, unit: '1M caracteres' }, 'tts-1-hd': { input: 30, output: 0, unit: '1M caracteres' } }
    const transcriptPricing: Record<string, { input: number; output: number }> = { 'gpt-4o-mini-transcribe': { input: 1.25, output: 5 }, 'gpt-4o-transcribe': { input: 2.5, output: 10 }, 'gpt-4o-transcribe-diarize': { input: 2.5, output: 10 }, 'whisper-1': { input: 0, output: 0 } }
    const fixed = kind === 'image'
      ? Object.entries(imagePricing).map(([id, price]) => ({ id, name: id, provider: 'openai', supportsImageToImage: true, supportedParameters: ['input_references', 'quality', 'size'], inputPricePerMillion: price.input, outputPricePerMillion: price.output, minImagePrice: price.low, pricingLines: price.low ? [{ billable: 'imagem de saída 1024x1024 low', unit: 'imagem', costUsd: price.low }] : [], pricingNote: id === 'gpt-image-2' ? 'Consulte o preço oficial vigente do modelo atual.' : '' }))
      : kind === 'voice'
        ? Object.entries(voicePricing).map(([id, price]) => ({ id, name: id, provider: 'openai', promptPrice: price.input / 1_000_000, inputPricePerMillion: price.input, outputPricePerMillion: price.output, pricingUnit: price.unit || '1M tokens', supportedVoices: ['alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse'], voices: ['alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse'].map(voice => ({ id: voice, gender: 'unknown', locale: 'multilíngue' })), ptBrSupported: true, supportedParameters: ['voice','response_format','speed','instructions'] }))
        : Object.entries(transcriptPricing).map(([id, price]) => ({ id, name: id, provider: 'openai', inputPricePerMillion: price.input, outputPricePerMillion: price.output, ptBrSupported: true, supportedParameters: ['language','prompt','response_format'] }))
    const value = { success: true, models: fixed }
    mediaModelCache[cacheKey] = { expires: Date.now() + 5 * 60_000, value }
    return value
  }
  const url = kind === 'image'
    ? 'https://openrouter.ai/api/v1/images/models'
    : `https://openrouter.ai/api/v1/models?output_modalities=${kind === 'voice' ? 'speech' : 'transcription'}`
  try {
    const response = await fetch(url, { headers: openRouterHeaders(accountId, kind) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json() as any
    const rawModels = (payload.data || [])
    const imageCandidates = kind === 'image' ? rawModels.filter((model: any) => (model.architecture?.input_modalities || []).includes('image') && (Array.isArray(model.supported_parameters) ? model.supported_parameters.includes('input_references') : Object.prototype.hasOwnProperty.call(model.supported_parameters || {}, 'input_references'))) : rawModels
    const endpointPrices = kind === 'image' ? await imageEndpointPricing(imageCandidates, openRouterHeaders(accountId, kind)) : new Map<string, any[]>()
    const models = imageCandidates.map((model: any) => {
      const descriptors = Array.isArray(model.supported_parameters) ? {} : model.supported_parameters || {}
      const pricingLines = endpointPrices.get(model.id) || []
      const voices = Array.isArray(model.supported_voices) ? model.supported_voices : []
      const promptPrice = Number(model.pricing?.prompt || 0)
      const completionPrice = Number(model.pricing?.completion || 0)
      return ({
      id: String(model.id || ''),
      name: String(model.name || model.id || ''),
      description: String(model.description || ''),
      contextLength: Number(model.context_length || model.top_provider?.context_length || 0),
      inputModalities: model.architecture?.input_modalities || [],
      outputModalities: model.architecture?.output_modalities || [],
      supportedParameters: Array.isArray(model.supported_parameters) ? model.supported_parameters : Object.keys(descriptors),
      parameterDescriptors: descriptors,
      supportedVoices: voices,
      voices: voices.map((voice: string) => ({ id: voice, gender: voiceGender(voice), locale: voiceLocale(voice, model.id) })),
      promptPrice,
      completionPrice,
      inputPricePerMillion: promptPrice * 1_000_000,
      outputPricePerMillion: completionPrice * 1_000_000,
      ptBrSupported: kind === 'transcription' ? /(?:whisper|transcribe|chirp|nova-3)/i.test(model.id) : model.id === 'hexgrad/kokoro-82m' || (model.id.startsWith('google/gemini-') && model.id.includes('tts')),
      provider: 'openrouter',
      supportsImageToImage: kind === 'image',
      maxReferences: Number(descriptors.input_references?.max || 0),
      pricingLines,
      minImagePrice: pricingLines.length ? Math.min(...pricingLines.map((line: any) => line.costUsd)) : 0,
      isFree: kind === 'image' ? pricingLines.length > 0 && pricingLines.every((line: any) => line.costUsd === 0) : isFreePricing(model),
    })}).filter((model: any) => model.id)
    models.sort((a: any, b: any) => kind === 'voice' ? a.promptPrice - b.promptPrice || a.name.localeCompare(b.name) : a.minImagePrice - b.minImagePrice || a.name.localeCompare(b.name))
    const value = { success: true, models }
    mediaModelCache[cacheKey] = { expires: Date.now() + 5 * 60_000, value }
    return value
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
  const provider = String(overrides.provider || (config as any).imageProvider || 'openrouter') as 'openrouter' | 'openai'
  const key = mediaProviderKey(accountId, 'image', provider)
  if (!key) return { success: false, error: `Configure ou reutilize uma chave ${provider === 'openai' ? 'OpenAI' : 'OpenRouter'} nesta conta.` }
  try {
    await enforceDailyLimit(accountId, 'image')
    const manualReferences = Array.isArray(overrides.inputReferences) ? overrides.inputReferences.slice(0, 16).map((item: any) => typeof item === 'string' ? { type: 'image_url', image_url: { url: item } } : item) : []
    // Uma referência enviada no laboratório substitui as imagens permanentes. Isso evita
    // misturar, sem o usuário perceber, uma foto antiga da base com a foto que acabou de escolher.
    const knowledgeReferences = !manualReferences.length && config.imageUseKnowledgeReferences && overrides.includeKnowledge !== false
      ? getKnowledgeImageReferences(accountId, 1)
      : []
    const inputReferences = [...manualReferences, ...knowledgeReferences].slice(0, 16).map(({ type, image_url }: any) => ({ type, image_url }))
    // O prompt conversacional pode conter regras/personagens incompatíveis com geração visual.
    // Somente as instruções visuais dedicadas pertencem à requisição de imagem.
    const contextualPrompt = [config.imageInstructions, prompt.trim()].filter(Boolean).join('\n\n')
    let response: Response
    if (provider === 'openai') {
      if (!inputReferences.length) throw new Error('O modo imagem→imagem exige ao menos uma foto de referência no teste ou nos arquivos de contexto.')
      const form = new FormData()
      form.append('model', model)
      form.append('prompt', contextualPrompt)
      form.append('quality', String(overrides.quality || config.imageQuality))
      for (const [index, reference] of inputReferences.entries()) {
        const match = String(reference.image_url?.url || '').match(/^data:([^;]+);base64,(.+)$/)
        if (match) form.append('image[]', new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }), `referencia-${index + 1}.${match[1].split('/')[1] || 'png'}`)
      }
      response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    } else response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: contextualPrompt,
        n: 1,
        aspect_ratio: overrides.aspectRatio || config.imageAspectRatio,
        resolution: overrides.resolution || config.imageResolution,
        quality: overrides.quality || config.imageQuality,
        output_format: 'png',
        ...(inputReferences.length ? { input_references: inputReferences } : {}),
      }),
    })
    if (!response.ok) {
      const raw = String(await response.text())
      let apiError: any = null
      try { apiError = JSON.parse(raw)?.error } catch {}
      const code = String(apiError?.code || '')
      const requestId = response.headers.get('x-request-id') || response.headers.get('x-openai-request-id') || ''
      if (code === 'moderation_blocked' || code === 'content_policy_violation') {
        throw new Error(`O modelo bloqueou a foto ou as instruções visuais pela moderação. Teste outra referência ou outro modelo imagem→imagem.${requestId ? ` ID: ${requestId}` : ''}`)
      }
      const detail = String(apiError?.message || raw).slice(0, 350)
      throw new Error(`HTTP ${response.status}${detail ? ` · ${detail}` : ''}${requestId ? ` · ID ${requestId}` : ''}`)
    }
    const payload = await response.json() as any
    const image = payload.data?.[0]
    if (!image?.b64_json) throw new Error('O modelo não retornou uma imagem.')
    const mediaType = String(image.media_type || 'image/png')
    await logMedia(accountId, 'image', model, 'generated')
    return { success: true, base64: String(image.b64_json), mediaType, model, referenceCount: inputReferences.length, usage: payload.usage || null }
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
  const provider = String(overrides.provider || (config as any).voiceProvider || 'openrouter') as 'openrouter' | 'openai'
  const key = mediaProviderKey(accountId, 'voice', provider)
  if (!key) return { success: false, error: `Configure ou reutilize uma chave ${provider === 'openai' ? 'OpenAI' : 'OpenRouter'} nesta conta.` }
  try {
    await enforceDailyLimit(accountId, 'voice')
    const response = await fetch(provider === 'openai' ? 'https://api.openai.com/v1/audio/speech' : 'https://openrouter.ai/api/v1/audio/speech', {
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

export async function transcribeAudio(accountId: string, audio: Buffer, format = 'ogg') {
  const config = getAiMediaConfig(accountId) as any
  if (!config.transcriptionEnabled) return { success: false, error: 'Transcrição de áudios está desativada.' }
  const provider = config.transcriptionProvider as 'openrouter' | 'openai'
  const key = mediaProviderKey(accountId, 'transcription', provider)
  if (!key) return { success: false, error: `Configure uma chave ${provider === 'openai' ? 'OpenAI' : 'OpenRouter'} para ouvir áudios.` }
  try {
    let response: Response
    if (provider === 'openai') {
      const form = new FormData()
      form.append('model', config.transcriptionModel.replace(/^openai\//, ''))
      form.append('language', config.transcriptionLanguage || 'pt')
      form.append('file', new Blob([audio], { type: `audio/${format}` }), `audio.${format}`)
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    } else response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.transcriptionModel, input_audio: { data: audio.toString('base64'), format }, language: config.transcriptionLanguage || 'pt' }) })
    if (!response.ok) throw new Error(`HTTP ${response.status} · ${String(await response.text()).slice(0, 300)}`)
    const payload = await response.json() as any
    return { success: true, text: String(payload.text || '').trim(), usage: payload.usage || null }
  } catch (error: any) { return { success: false, error: `Transcrição: ${error?.message || 'falha'}` } }
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

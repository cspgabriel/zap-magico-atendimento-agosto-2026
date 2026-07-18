import { all, one, run, getDb } from '../shared/database'
import { providerKey } from './ai'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'
import { sendMessage } from './whatsapp'

const WARMUP_MODEL = 'google/gemini-2.0-flash-exp:free'

type WarmupPlan = '7' | '14' | '21' | '28'

interface PlanDay {
  day: number
  conversations: number
  intervalMin: number
  intervalMax: number
}

const PLANS: Record<WarmupPlan, PlanDay[]> = {
  '7': [
    { day: 1, conversations: 10, intervalMin: 50, intervalMax: 80 },
    { day: 2, conversations: 20, intervalMin: 35, intervalMax: 60 },
    { day: 3, conversations: 30, intervalMin: 25, intervalMax: 45 },
    { day: 4, conversations: 40, intervalMin: 18, intervalMax: 35 },
    { day: 5, conversations: 55, intervalMin: 12, intervalMax: 25 },
    { day: 6, conversations: 70, intervalMin: 8, intervalMax: 18 },
    { day: 7, conversations: 80, intervalMin: 6, intervalMax: 14 },
  ],
  '14': [
    { day: 1, conversations: 5, intervalMin: 90, intervalMax: 140 },
    { day: 2, conversations: 10, intervalMin: 70, intervalMax: 110 },
    { day: 3, conversations: 15, intervalMin: 55, intervalMax: 90 },
    { day: 4, conversations: 20, intervalMin: 45, intervalMax: 75 },
    { day: 5, conversations: 25, intervalMin: 38, intervalMax: 65 },
    { day: 6, conversations: 30, intervalMin: 32, intervalMax: 55 },
    { day: 7, conversations: 40, intervalMin: 25, intervalMax: 48 },
    { day: 8, conversations: 50, intervalMin: 20, intervalMax: 40 },
    { day: 9, conversations: 60, intervalMin: 16, intervalMax: 34 },
    { day: 10, conversations: 70, intervalMin: 13, intervalMax: 28 },
    { day: 11, conversations: 80, intervalMin: 11, intervalMax: 24 },
    { day: 12, conversations: 90, intervalMin: 9, intervalMax: 20 },
    { day: 13, conversations: 100, intervalMin: 8, intervalMax: 18 },
    { day: 14, conversations: 120, intervalMin: 7, intervalMax: 15 },
  ],
  '21': [
    { day: 1, conversations: 3, intervalMin: 120, intervalMax: 180 },
    { day: 2, conversations: 5, intervalMin: 100, intervalMax: 150 },
    { day: 3, conversations: 8, intervalMin: 85, intervalMax: 130 },
    { day: 4, conversations: 10, intervalMin: 75, intervalMax: 115 },
    { day: 5, conversations: 15, intervalMin: 60, intervalMax: 100 },
    { day: 6, conversations: 20, intervalMin: 50, intervalMax: 85 },
    { day: 7, conversations: 25, intervalMin: 42, intervalMax: 72 },
    { day: 8, conversations: 30, intervalMin: 36, intervalMax: 62 },
    { day: 9, conversations: 35, intervalMin: 32, intervalMax: 55 },
    { day: 10, conversations: 40, intervalMin: 28, intervalMax: 50 },
    { day: 11, conversations: 50, intervalMin: 22, intervalMax: 42 },
    { day: 12, conversations: 55, intervalMin: 20, intervalMax: 38 },
    { day: 13, conversations: 60, intervalMin: 18, intervalMax: 34 },
    { day: 14, conversations: 65, intervalMin: 16, intervalMax: 30 },
    { day: 15, conversations: 70, intervalMin: 14, intervalMax: 27 },
    { day: 16, conversations: 75, intervalMin: 13, intervalMax: 25 },
    { day: 17, conversations: 80, intervalMin: 11, intervalMax: 22 },
    { day: 18, conversations: 85, intervalMin: 10, intervalMax: 20 },
    { day: 19, conversations: 90, intervalMin: 9, intervalMax: 18 },
    { day: 20, conversations: 95, intervalMin: 8, intervalMax: 17 },
    { day: 21, conversations: 100, intervalMin: 8, intervalMax: 15 },
  ],
  '28': [
    { day: 1, conversations: 3, intervalMin: 140, intervalMax: 200 },
    { day: 2, conversations: 5, intervalMin: 120, intervalMax: 170 },
    { day: 3, conversations: 7, intervalMin: 105, intervalMax: 150 },
    { day: 4, conversations: 10, intervalMin: 90, intervalMax: 135 },
    { day: 5, conversations: 12, intervalMin: 80, intervalMax: 120 },
    { day: 6, conversations: 15, intervalMin: 70, intervalMax: 108 },
    { day: 7, conversations: 18, intervalMin: 62, intervalMax: 98 },
    { day: 8, conversations: 20, intervalMin: 56, intervalMax: 90 },
    { day: 9, conversations: 25, intervalMin: 48, intervalMax: 78 },
    { day: 10, conversations: 30, intervalMin: 42, intervalMax: 68 },
    { day: 11, conversations: 35, intervalMin: 37, intervalMax: 60 },
    { day: 12, conversations: 40, intervalMin: 33, intervalMax: 55 },
    { day: 13, conversations: 45, intervalMin: 30, intervalMax: 50 },
    { day: 14, conversations: 50, intervalMin: 27, intervalMax: 46 },
    { day: 15, conversations: 55, intervalMin: 24, intervalMax: 42 },
    { day: 16, conversations: 60, intervalMin: 22, intervalMax: 38 },
    { day: 17, conversations: 65, intervalMin: 20, intervalMax: 35 },
    { day: 18, conversations: 70, intervalMin: 18, intervalMax: 32 },
    { day: 19, conversations: 75, intervalMin: 16, intervalMax: 29 },
    { day: 20, conversations: 80, intervalMin: 15, intervalMax: 27 },
    { day: 21, conversations: 85, intervalMin: 13, intervalMax: 25 },
    { day: 22, conversations: 90, intervalMin: 12, intervalMax: 23 },
    { day: 23, conversations: 95, intervalMin: 11, intervalMax: 21 },
    { day: 24, conversations: 100, intervalMin: 10, intervalMax: 20 },
    { day: 25, conversations: 105, intervalMin: 9, intervalMax: 18 },
    { day: 26, conversations: 110, intervalMin: 9, intervalMax: 17 },
    { day: 27, conversations: 115, intervalMin: 8, intervalMax: 16 },
    { day: 28, conversations: 120, intervalMin: 7, intervalMax: 15 },
  ],
}

const TOPICS = [
  'futebol', 'trabalho', 'familia', 'comida', 'viagem', 'musica', 'filme',
  'financas', 'saude', 'exercicio', 'tecnologia', 'carro', 'casa', 'pets',
  'receitas', 'jardinagem', 'leitura', 'jogos', 'moda', 'eletronicos',
]

const MEDIA_TYPES = { text: 70, emoji: 15, image: 10, sticker: 5 }

let mainWindow: BrowserWindow | null = null
const activeTasks = new Map<string, AbortController>()

export function setWarmupWindow(win: BrowserWindow) {
  mainWindow = win
}

function notify(channel: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

function jitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function pickMediaType(): string {
  const roll = Math.random() * 100
  if (roll < MEDIA_TYPES.text) return 'text'
  if (roll < MEDIA_TYPES.text + MEDIA_TYPES.emoji) return 'emoji'
  if (roll < MEDIA_TYPES.text + MEDIA_TYPES.emoji + MEDIA_TYPES.image) return 'image'
  return 'sticker'
}

function pickTopic(): string {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}

function isWithinActiveHours(): boolean {
  const h = new Date().getHours()
  return h >= 8 && h < 22
}

function generateConversationPrompt(topic: string, mediaType: string): string {
  const mediaHint = mediaType === 'emoji'
    ? 'Use 1-3 emojis na mensagem junto com texto curto.'
    : mediaType === 'image'
    ? 'Mencione uma imagem (ex: "olha essa foto") na mensagem.'
    : mediaType === 'sticker'
    ? 'Mencione um sticker divertido na mensagem.'
    : 'Escreva uma mensagem de texto normal.'

  return `Gere UMA frase curta (1-2 linhas max) de uma pessoa brasileira real conversando por WhatsApp sobre ${topic}.
Linguagem natural, gírias (blz, tmj, vlw, tipo, mané, etc), sem parecer robô.
${mediaHint}
Retorne SOMENTE a mensagem, sem aspas, sem explicação.`
}

async function generateWarmupMessage(prompt: string): Promise<{ success: boolean; text?: string; error?: string }> {
  const key = providerKey('openrouter')
  if (!key) return { success: false, error: 'Chave OpenRouter não configurada. Vá em Configurações > IA e adicione sua chave.' }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://zapmagico.app',
        'X-Title': 'Zap Magico Warmup',
      },
      body: JSON.stringify({
        model: WARMUP_MODEL,
        messages: [
          { role: 'system', content: 'Você é uma pessoa brasileira comum enviando mensagem pelo WhatsApp. Responda SOMENTE com a mensagem, sem aspas, sem explicação, sem introdução.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 120,
      }),
    })
    if (!response.ok) throw new Error(`OpenRouter: HTTP ${response.status}`)
    const data = await response.json() as any
    const text = String(data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '')
    if (!text) return { success: false, error: 'Resposta vazia da IA' }
    return { success: true, text }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export function getWarmupPlans() {
  return Object.entries(PLANS).map(([days, config]) => ({
    days: parseInt(days),
    totalConversations: config.reduce((acc, d) => acc + d.conversations, 0),
    maxDaily: config[config.length - 1].conversations,
    stages: config,
  }))
}

export async function listWarmupTasks() {
  const db = await getDb()
  return all(db, 'SELECT * FROM warmup_tasks ORDER BY created_at DESC')
}

export async function getWarmupLogs(taskId: string, limit = 50) {
  const db = await getDb()
  return all(db, 'SELECT * FROM warmup_log WHERE task_id = ? ORDER BY sent_at DESC LIMIT ?', [taskId, limit])
}

export async function getWarmupPairs(taskId: string) {
  const db = await getDb()
  return all(db, 'SELECT * FROM warmup_pairs WHERE task_id = ? AND active = 1', [taskId])
}

export async function createWarmupTask(input: { name: string; phone: string; plan: WarmupPlan; targetPhones?: string[] }) {
  const db = await getDb()
  const id = uuidv4()
  const planConfig = PLANS[input.plan]
  if (!planConfig) return { success: false, error: 'Plano inválido' }

  run(db,
    `INSERT INTO warmup_tasks (id, name, phone, plan, status, current_day, conversations_today, target_today)
     VALUES (?, ?, ?, ?, 'idle', 0, 0, ?)`,
    [id, input.name, input.phone, input.plan, planConfig[0].conversations])

  if (input.targetPhones && input.targetPhones.length > 0) {
    for (const target of input.targetPhones) {
      run(db,
        'INSERT INTO warmup_pairs (id, task_id, source_phone, target_phone) VALUES (?, ?, ?, ?)',
        [uuidv4(), id, input.phone, target])
    }
  }

  return { success: true, id }
}

export async function startWarmupTask(taskId: string) {
  const db = await getDb()
  const task = one(db, 'SELECT * FROM warmup_tasks WHERE id = ?', [taskId]) as any
  if (!task) return { success: false, error: 'Tarefa não encontrada' }
  if (task.status === 'running') return { success: false, error: 'Tarefa já está em execução' }

  const planConfig = PLANS[task.plan as WarmupPlan]
  if (!planConfig) return { success: false, error: 'Plano inválido' }

  const pairs = all(db, 'SELECT * FROM warmup_pairs WHERE task_id = ? AND active = 1', [taskId]) as any[]
  if (pairs.length === 0) return { success: false, error: 'Adicione pelo menos um telefone alvo antes de iniciar.' }

  const key = providerKey('openrouter')
  if (!key) return { success: false, error: 'Configure a chave OpenRouter em Configurações > IA para usar o aquecimento.' }

  run(db, "UPDATE warmup_tasks SET status = 'running', started_at = datetime('now') WHERE id = ?", [taskId])

  const controller = new AbortController()
  activeTasks.set(taskId, controller)

  runWarmupLoop(taskId, task, planConfig, controller.signal).catch(() => {
    run(db, "UPDATE warmup_tasks SET status = 'paused' WHERE id = ?", [taskId])
    notify('warmup:status', { taskId, status: 'paused' })
  })

  return { success: true }
}

export async function pauseWarmupTask(taskId: string) {
  const controller = activeTasks.get(taskId)
  if (controller) {
    controller.abort()
    activeTasks.delete(taskId)
  }
  const db = await getDb()
  run(db, "UPDATE warmup_tasks SET status = 'paused' WHERE id = ?", [taskId])
  notify('warmup:status', { taskId, status: 'paused' })
  return { success: true }
}

export async function stopWarmupTask(taskId: string) {
  const controller = activeTasks.get(taskId)
  if (controller) {
    controller.abort()
    activeTasks.delete(taskId)
  }
  const db = await getDb()
  run(db, "UPDATE warmup_tasks SET status = 'idle', finished_at = datetime('now') WHERE id = ?", [taskId])
  notify('warmup:status', { taskId, status: 'idle' })
  return { success: true }
}

export async function resetWarmupTask(taskId: string) {
  const controller = activeTasks.get(taskId)
  if (controller) {
    controller.abort()
    activeTasks.delete(taskId)
  }
  const db = await getDb()
  run(db, 'DELETE FROM warmup_log WHERE task_id = ?', [taskId])
  run(db, 'DELETE FROM warmup_pairs WHERE task_id = ?', [taskId])
  run(db, "UPDATE warmup_tasks SET status = 'idle', current_day = 0, conversations_today = 0, target_today = 0, started_at = NULL, last_run_at = NULL, finished_at = NULL WHERE id = ?", [taskId])
  notify('warmup:status', { taskId, status: 'idle' })
  return { success: true }
}

export async function deleteWarmupTask(taskId: string) {
  const controller = activeTasks.get(taskId)
  if (controller) {
    controller.abort()
    activeTasks.delete(taskId)
  }
  const db = await getDb()
  run(db, 'DELETE FROM warmup_log WHERE task_id = ?', [taskId])
  run(db, 'DELETE FROM warmup_pairs WHERE task_id = ?', [taskId])
  run(db, 'DELETE FROM warmup_tasks WHERE id = ?', [taskId])
  return { success: true }
}

async function runWarmupLoop(taskId: string, task: any, planConfig: PlanDay[], signal: AbortSignal) {
  const db = await getDb()
  let currentDay = task.current_day || 1
  let sentToday = task.conversations_today || 0

  while (currentDay <= planConfig.length) {
    if (signal.aborted) return

    const dayConfig = planConfig[currentDay - 1]
    const target = dayConfig.conversations

    if (!isWithinActiveHours()) {
      notify('warmup:log', { taskId, message: `Aguardando horário ativo (08h-22h)...`, type: 'info' })
      await sleep(60_000, signal)
      continue
    }

    if (sentToday >= target) {
      notify('warmup:log', { taskId, message: `Dia ${currentDay} concluído: ${sentToday}/${target} conversas`, type: 'success' })
      currentDay++
      sentToday = 0
      run(db, 'UPDATE warmup_tasks SET current_day = ?, conversations_today = 0 WHERE id = ?', [currentDay, taskId])
      notify('warmup:progress', { taskId, currentDay, sentToday, targetToday: currentDay <= planConfig.length ? planConfig[currentDay - 1]?.conversations || 0 : 0 })
      continue
    }

    const pairs = all(db, 'SELECT * FROM warmup_pairs WHERE task_id = ? AND active = 1', [taskId]) as any[]
    if (pairs.length === 0) {
      notify('warmup:log', { taskId, message: 'Sem pares configurados. Adicione telefones alvo para iniciar.', type: 'error' })
      await sleep(30_000, signal)
      continue
    }

    const targetPhone = pairs[Math.floor(Math.random() * pairs.length)].target_phone

    const topic = pickTopic()
    const mediaType = pickMediaType()

    try {
      const result = await generateWarmupMessage(generateConversationPrompt(topic, mediaType))

      if (result.success && result.text) {
        const phone = task.phone
        const sent = await sendMessage(targetPhone, result.text)

        if (sent.success) {
          sentToday++
          run(db,
            `INSERT INTO warmup_log (id, task_id, phone, direction, message, topic, day, hour) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), taskId, phone, 'outbound', result.text, topic, currentDay, new Date().getHours()])

          run(db,
            'UPDATE warmup_tasks SET conversations_today = ?, target_today = ?, last_run_at = datetime(\'now\') WHERE id = ?',
            [sentToday, target, taskId])

          notify('warmup:progress', { taskId, currentDay, sentToday, targetToday: target, topic, message: result.text })
        }
      }
    } catch (err: any) {
      notify('warmup:log', { taskId, message: `Erro: ${err.message}`, type: 'error' })
    }

    const interval = jitter(dayConfig.intervalMin, dayConfig.intervalMax)
    notify('warmup:log', { taskId, message: `Próxima em ${interval}s (dia ${currentDay}: ${sentToday}/${target})`, type: 'info' })

    await sleep(interval * 1000, signal)
  }

  run(db, "UPDATE warmup_tasks SET status = 'completed', finished_at = datetime('now') WHERE id = ?", [taskId])
  notify('warmup:status', { taskId, status: 'completed' })
  activeTasks.delete(taskId)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
}

import React, { useEffect, useState, useCallback } from 'react'
import { Flame, Play, Pause, Square, RotateCcw, Trash2, Plus, ChevronDown, ChevronUp, Clock, MessageCircle, Zap, ShieldCheck } from 'lucide-react'
import { useTheme } from '../theme'

interface WarmupTask {
  id: string
  name: string
  phone: string
  plan: string
  status: string
  current_day: number
  conversations_today: number
  target_today: number
  started_at: string
  last_run_at: string
  created_at: string
  finished_at: string
}

interface WarmupLog {
  id: string
  task_id: string
  phone: string
  direction: string
  message: string
  topic: string
  day: number
  hour: number
  sent_at: string
}

interface PlanInfo {
  days: number
  totalConversations: number
  maxDaily: number
  stages: { day: number; conversations: number; intervalMin: number; intervalMax: number }[]
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: 'Parado', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  running: { label: 'Aquecendo', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  paused: { label: 'Pausado', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: 'Concluído', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

export default function Warmup() {
  const { colors } = useTheme()
  const [tasks, setTasks] = useState<WarmupTask[]>([])
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [logs, setLogs] = useState<WarmupLog[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', phone: '', plan: '14', targetPhones: '' })
  const [liveProgress, setLiveProgress] = useState<Record<string, { currentDay: number; sentToday: number; targetToday: number; topic?: string; message?: string }>>({})
  const [startError, setStartError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([window.zap.warmupList(), window.zap.warmupPlans()])
    setTasks(t)
    setPlans(p)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.zap.getStatus().then((s: any) => {
      if (s.connected && s.phone) setCreateForm(f => ({ ...f, phone: s.phone }))
    })
  }, [])

  useEffect(() => {
    const unsub1 = window.zap.on('warmup:progress', (data) => {
      setLiveProgress((prev) => ({ ...prev, [data.taskId]: { currentDay: data.currentDay, sentToday: data.sentToday, targetToday: data.targetToday, topic: data.topic, message: data.message } }))
      if (selectedTask === data.taskId) {
        window.zap.warmupLogs(data.taskId, 30).then(setLogs)
      }
    })
    const unsub2 = window.zap.on('warmup:status', () => load())
    const unsub3 = window.zap.on('warmup:log', () => {
      if (selectedTask) window.zap.warmupLogs(selectedTask, 30).then(setLogs)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [selectedTask, load])

  useEffect(() => {
    if (selectedTask) window.zap.warmupLogs(selectedTask, 30).then(setLogs)
  }, [selectedTask])

  const handleCreate = async () => {
    if (!createForm.name || !createForm.phone) return
    const phones = createForm.targetPhones.split(/[,\n]/).map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10)
    await window.zap.warmupCreate({ name: createForm.name, phone: createForm.phone.replace(/\D/g, ''), plan: createForm.plan, targetPhones: phones.length > 0 ? phones : undefined })
    setShowCreate(false)
    setCreateForm({ name: '', phone: '', plan: '14', targetPhones: '' })
    load()
  }

  const planInfo = plans.find(p => p.days === parseInt(createForm.plan))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
          <Flame size={19} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Aquecimento de Chips</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '4px 0 0' }}>Progressão automática de volume com conversas geradas por IA para reduzir risco de banimento.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: colors.accent, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {plans.map((p) => (
          <div key={p.days} onClick={() => setCreateForm(f => ({ ...f, plan: String(p.days) }))} style={{
            background: createForm.plan === String(p.days) ? colors.successBg : colors.surface,
            border: `1px solid ${createForm.plan === String(p.days) ? colors.accent : colors.border}`,
            borderRadius: 10, padding: 15, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 750, color: createForm.plan === String(p.days) ? colors.accent : colors.text }}>{p.days} dias</span>
              <Flame size={16} color={createForm.plan === String(p.days) ? colors.accent : colors.textMuted} />
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {p.totalConversations} conversas total · máx {p.maxDaily}/dia
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18, marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Criar tarefa de aquecimento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Nome da tarefa</label>
              <input value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Chip principal" style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Telefone da linha</label>
              <input value={createForm.phone} onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="5511999999999" style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, fontSize: 13 }} />
              <span style={{ fontSize: 11, color: colors.textDim }}>Preenchido automaticamente da linha conectada</span>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
              Telefones alvo <span style={{ color: colors.danger }}>*</span> (um por linha ou vírgula)
            </label>
            <textarea value={createForm.targetPhones} onChange={(e) => setCreateForm(f => ({ ...f, targetPhones: e.target.value }))} rows={3} placeholder="5511888888888&#10;5511777777777" style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: `1px solid ${createForm.targetPhones ? colors.border : colors.danger}`, background: colors.surface2, color: colors.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: colors.textDim }}>Obrigatório — o sistema envia conversas da sua linha para esses números</span>
          </div>
          {planInfo && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: colors.surface2, fontSize: 12, color: colors.textMuted }}>
              <ShieldCheck size={14} color={colors.accent} style={{ verticalAlign: -2, marginRight: 6 }} />
              Plano de {createForm.plan} dias: {planInfo.totalConversations} conversas totais, máx {planInfo.maxDaily}/dia, intervalos entre {planInfo.stages[0]?.intervalMin}s e {planInfo.stages[planInfo.stages.length - 1]?.intervalMax}s
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} style={{ padding: '9px 20px', borderRadius: 7, border: 'none', background: colors.accent, color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Criar tarefa</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '9px 16px', borderRadius: 7, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !showCreate && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <Flame size={36} color={colors.textDim} style={{ margin: '0 auto 12px' }} />
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>Nenhuma tarefa de aquecimento criada.</p>
          <p style={{ color: colors.textDim, fontSize: 12, margin: '6px 0 0' }}>Crie uma tarefa para começar a aquecer sua linha.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1fr)', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => {
            const st = STATUS_MAP[task.status] || STATUS_MAP.idle
            const live = liveProgress[task.id]
            const planStages = plans.find(p => p.days === parseInt(task.plan))?.stages || []
            const dayConfig = planStages[task.current_day - 1]
            const progress = dayConfig ? ((live?.sentToday ?? task.conversations_today) / dayConfig.conversations) * 100 : 0
            const isExpanded = expandedTask === task.id

            return (
              <div key={task.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div onClick={() => { setExpandedTask(isExpanded ? null : task.id); setSelectedTask(task.id) }} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, boxShadow: `0 0 8px ${st.color}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>{task.name}</strong>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{task.phone} · {task.plan} dias · Dia {task.current_day || '-'}</div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                </div>

                {dayConfig && (task.status === 'running' || live) && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                      <span>{live?.sentToday ?? task.conversations_today} / {dayConfig.conversations} conversas</span>
                      <span>{Math.min(100, Math.round(progress))}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: colors.surface2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: colors.accent, width: `${Math.min(100, progress)}%`, transition: 'width 0.4s' }} />
                    </div>
                    {live?.topic && <div style={{ fontSize: 11, color: colors.textDim, marginTop: 6, fontStyle: 'italic' }}>Tópico: {live.topic}</div>}
                  </div>
                )}

                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${colors.border}`, padding: '12px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {task.status !== 'running' && (
                      <button onClick={async (e) => {
                        e.stopPropagation()
                        setStartError(null)
                        const result = await window.zap.warmupStart(task.id)
                        if (!result.success) setStartError(result.error || 'Erro ao iniciar')
                      }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: colors.accent, color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <Play size={13} /> Iniciar
                      </button>
                    )}
                    {task.status === 'running' && (
                      <button onClick={(e) => { e.stopPropagation(); window.zap.warmupPause(task.id) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.warning}`, background: 'transparent', color: colors.warning, fontSize: 12, cursor: 'pointer' }}>
                        <Pause size={13} /> Pausar
                      </button>
                    )}
                    {(task.status === 'paused' || task.status === 'completed') && (
                      <button onClick={(e) => { e.stopPropagation(); window.zap.warmupReset(task.id).then(load) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>
                        <RotateCcw size={13} /> Resetar
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); window.zap.warmupStop(task.id) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, fontSize: 12, cursor: 'pointer' }}>
                      <Square size={13} /> Parar
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); window.zap.warmupDelete(task.id).then(load) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.danger}`, background: 'transparent', color: colors.danger, fontSize: 12, cursor: 'pointer' }}>
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                )}
                {isExpanded && startError && (
                  <div style={{ padding: '8px 16px', fontSize: 12, color: colors.danger, background: colors.errorBg, borderRadius: '0 0 10px 10px' }}>{startError}</div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageCircle size={16} color={colors.accent} />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Log de conversas</h3>
          </div>
          {!selectedTask ? (
            <p style={{ color: colors.textDim, fontSize: 12, margin: 0 }}>Selecione uma tarefa para ver o log.</p>
          ) : logs.length === 0 ? (
            <p style={{ color: colors.textDim, fontSize: 12, margin: 0 }}>Nenhuma conversa registrada ainda.</p>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {logs.map((log) => (
                <div key={log.id} style={{ padding: '8px 10px', borderRadius: 6, background: colors.surface2, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: colors.accent, fontWeight: 600 }}>Dia {log.day} · {log.hour}h</span>
                    <span style={{ color: colors.textDim, fontSize: 11 }}>{log.topic}</span>
                  </div>
                  <div style={{ color: colors.text, lineHeight: 1.4 }}>{log.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Zap size={16} color={colors.warning} />
          <strong style={{ fontSize: 13 }}>Como funciona o aquecimento</strong>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 6px' }}>O sistema aumenta gradualmente o volume de mensagens diárias ao longo do plano escolhido, simulando comportamento humano real.</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Horário ativo: 08h–22h (horário local)</li>
            <li>Intervalos variados entre mensagens (jitter anti-ban)</li>
            <li>Conteúdo gerado por <strong>OpenRouter (modelo gratuito)</strong> com tópicos variados</li>
            <li>Mix de tipos: 70% texto, 15% emoji, 10% imagem, 5% sticker</li>
            <li><strong>Obrigatório:</strong> adicionar telefones alvo para enviar conversas</li>
            <li>Nunca envie mensagens de marketing durante o aquecimento</li>
          </ul>
          <p style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: 6, background: colors.surface2, fontSize: 11 }}>
            <strong>Modelo:</strong> google/gemini-2.0-flash-exp:free via OpenRouter · Configure sua chave API em Configurações → IA
          </p>
        </div>
      </div>
    </div>
  )
}

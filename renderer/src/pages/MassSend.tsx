import React, { useEffect, useState } from 'react'
import WhatsAppEditor from '../components/WhatsAppEditor'
import { useTheme } from '../theme'
import LimitRecommendations from '../components/LimitRecommendations'
import AiMessageTools from '../components/AiMessageTools'

export default function MassSend({ accountId = 'default', embedded = false, composeOnly = false }: { accountId?: string; embedded?: boolean; composeOnly?: boolean }) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [campName, setCampName] = useState('')
  const [message, setMessage] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [tab, setTab] = useState<'new' | 'scheduled' | 'history'>('new')
  const { colors } = useTheme()

  useEffect(() => { load() }, [accountId])
  useEffect(() => {
    const unsub = window.zap.on('campaign:progress', (d) => setProgress(d))
    return unsub
  }, [])

  async function load() {
    setCampaigns(await window.zap.getCampaigns(accountId))
    setContacts(await window.zap.getContacts())
    setTemplates(await window.zap.getTemplates())
  }

  function resetForm() {
    setCampName(''); setMessage(''); setTemplateId(''); setSelectedIds([])
    setScheduledAt(''); setEditId(null)
  }

  async function handleSave() {
    const payload: any = {
      name: campName,
      accountId,
      message,
      contactIds: selectedIds,
      templateId: templateId || undefined,
      delay_min: 10, delay_max: 30, pause_every: 50, pause_duration: 60, daily_limit: 500,
    }
    if (scheduledAt) payload.scheduled_at = scheduledAt.replace('T', ' ')

    if (editId) {
      payload.id = editId
      // preserve existing contacts for edits
      await window.zap.updateCampaign(payload)
    } else {
      await window.zap.createCampaign(payload)
    }
    resetForm()
    load()
  }

  function startEdit(c: any) {
    setEditId(c.id)
    setCampName(c.name)
    setTemplateId(c.template_id || '')
    setScheduledAt(c.scheduled_at ? c.scheduled_at.replace(' ', 'T') : '')
    setTab('new')
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta campanha e todas as mensagens?')) return
    await window.zap.deleteCampaign(id)
    load()
  }

  async function handleStart(campaignId: string) {
    setRunning(campaignId)
    setProgress(null)
    await window.zap.startCampaign(campaignId)
    setRunning(null)
    load()
  }

  function toggleContact(id: string) {
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  function selectAll() {
    setSelectedIds(contacts.length === selectedIds.length ? [] : contacts.map((c) => c.id))
  }

  const scheduled = campaigns.filter((c) => c.status === 'scheduled')
  const history = campaigns.filter((c) => c.status !== 'scheduled')

  return (
    <div>
      {!embedded && <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Campanhas moderadas</h2>}
      <div style={{ background: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warning}`, borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.45, marginBottom: 16 }}>
        Este módulo é secundário. Use apenas com contatos que deram permissão, volumes baixos, pausas longas e mensagem útil. O foco principal do sistema é atendimento ao cliente.
      </div>
      <LimitRecommendations compact />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(composeOnly ? ['new', 'scheduled'] : ['new', 'scheduled', 'history']).map((t) => (
          <button key={t} onClick={() => setTab(t as any)} style={{
            padding: '8px 20px', border: tab === t ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
            borderRadius: 6, background: tab === t ? colors.surface2 : 'transparent', color: colors.text, cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400,
          }}>
            {t === 'new' ? 'Nova campanha moderada' : t === 'scheduled' ? `Agendadas (${scheduled.length})` : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ background: colors.surface, borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: colors.accent }}>
                {editId ? 'Editar campanha moderada' : 'Nova campanha moderada'}
              </h3>
              <input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Nome da campanha"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border2}`, borderRadius: 6, background: colors.bg, color: colors.text, fontSize: 14, marginBottom: 12, outline: 'none' }}
              />
              {templates.length > 0 && (
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border2}`, borderRadius: 6, background: colors.bg, color: colors.text, fontSize: 14, marginBottom: 12, outline: 'none' }}>
                  <option value="">Sem template</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <label style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Mensagem com permissão do cliente (use {'{nome}'} e {'{telefone}'})</label>
              <WhatsAppEditor value={message} onChange={setMessage} placeholder="Olá {nome}, tudo bem?" minRows={4} />
              <AiMessageTools value={message} onChange={setMessage} />

              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" id="scheduleToggle" checked={!!scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.checked ? new Date(Date.now() + 3600000).toISOString().slice(0, 16) : '')} />
                <label htmlFor="scheduleToggle" style={{ fontSize: 13, color: colors.textMuted }}>Agendar para depois</label>
              </div>
              {scheduledAt && (
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border2}`, borderRadius: 6, background: colors.bg, color: colors.text, fontSize: 14, marginTop: 8, outline: 'none' }}
                />
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={handleSave} disabled={!campName || selectedIds.length === 0} style={{
                  padding: '10px 24px', border: 'none', borderRadius: 6,
                  background: colors.accent, color: '#0f1a14', cursor: (!campName || selectedIds.length === 0) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
                }}>
                  {editId ? 'Atualizar' : scheduledAt ? 'Agendar Disparo' : 'Criar e Iniciar'} ({selectedIds.length} contatos)
                </button>
                {editId && <button onClick={resetForm} style={{
                  padding: '10px 20px', border: `1px solid ${colors.border}`, borderRadius: 6, background: 'transparent', color: colors.textMuted, cursor: 'pointer', fontSize: 13,
                }}>Cancelar</button>}
              </div>
            </div>

            {progress && (
              <div style={{ background: colors.surface, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Progresso</div>
                <div style={{ background: colors.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${(progress.sent + progress.failed) / progress.total * 100}%`, height: '100%', background: colors.accent, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                  {progress.sent} enviadas · {progress.failed} falhas · {progress.total} total
                </div>
              </div>
            )}

            <div style={{ background: colors.surface, borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: colors.accent }}>Contatos</h3>
              {contacts.length === 0 && <p style={{ fontSize: 13, color: colors.textDim }}>Nenhum contato. Importe em Contatos.</p>}
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: colors.textMuted, cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
                  <input type="checkbox" checked={contacts.length > 0 && selectedIds.length === contacts.length} onChange={selectAll} />
                  <strong>Selecionar todos ({contacts.length})</strong>
                </label>
                {contacts.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                    <span style={{ color: colors.text }}>{c.name || c.phone}</span>
                    <span style={{ color: colors.textDim, marginLeft: 'auto' }}>{c.phone}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'scheduled' && (
        <div style={{ background: colors.surface, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Campanhas Agendadas</h3>
          {scheduled.length === 0 && <p style={{ fontSize: 13, color: colors.textDim }}>Nenhuma campanha agendada.</p>}
          {scheduled.map((c) => (
            <div key={c.id} style={{ background: colors.surface2, borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    ⏰ Agendado para: <strong style={{ color: colors.warning }}>{c.scheduled_at}</strong>
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 12 }}>
                    {c.total_contacts} contatos · Delay {c.delay_min}s-{c.delay_max}s · Pausa a cada {c.pause_every} por {c.pause_duration}s · Limite {c.daily_limit}/dia
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(c)} style={{
                    padding: '6px 14px', background: colors.accent, color: '#0f1a14', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>Editar</button>
                  <button onClick={() => handleStart(c.id)} style={{
                    padding: '6px 14px', background: colors.accent2, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>Iniciar agora</button>
                  <button onClick={() => handleDelete(c.id)} style={{
                    padding: '6px 14px', background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: 6, cursor: 'pointer', fontSize: 12,
                  }}>Deletar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ background: colors.surface, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Campanhas Anteriores</h3>
          {history.length === 0 && <p style={{ fontSize: 13, color: colors.textDim }}>Nenhuma campanha ainda.</p>}
          {history.map((c) => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Status: <span style={{ fontWeight: 600, color: c.status === 'completed' ? colors.success : c.status === 'running' ? colors.warning : colors.textMuted }}>
                    {c.status === 'completed' ? 'Concluída' : c.status === 'running' ? 'Executando' : c.status === 'paused' ? 'Pausada' : c.status}
                  </span>
                  {c.sent_count > 0 && ` · ${c.sent_count} enviadas`}
                  {c.fail_count > 0 && ` · ${c.fail_count} falhas`}
                  {c.scheduled_at && ` · Agendada: ${c.scheduled_at}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {c.status === 'paused' && (
                  <button onClick={() => handleStart(c.id)} style={{
                    padding: '6px 14px', background: colors.accent, color: '#0f1a14', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>Retomar</button>
                )}
                <button onClick={() => handleDelete(c.id)} style={{
                  padding: '6px 14px', background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: 6, cursor: 'pointer', fontSize: 12,
                }}>Deletar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

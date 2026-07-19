import React, { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, FileText, Mail, Plus, RefreshCw, Search, Send, ShieldAlert, Users } from 'lucide-react'
import { useTheme } from '../theme'

const statusLabels: Record<string, string> = {
  completed: 'Concluída', running: 'Em andamento', pending: 'Pendente', scheduled: 'Agendada', paused: 'Pausada', failed: 'Falhou',
}

function formatDate(value?: string) {
  if (!value) return '—'
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export default function Campaigns({ accountId = 'default', onNewCampaign }: { accountId?: string; onNewCampaign: () => void }) {
  const { colors } = useTheme()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const rows = await window.zap.getCampaigns(accountId)
      setCampaigns(rows)
      setSelectedId(current => rows.some((row: any) => row.id === current) ? current : rows[0]?.id || '')
    } catch (reason: any) { setError(reason?.message || 'Não foi possível carregar as campanhas.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [accountId])
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    window.zap.getCampaignMessages(selectedId).then(setMessages).catch(() => setMessages([]))
  }, [selectedId])

  const selected = campaigns.find(campaign => campaign.id === selectedId)
  const filtered = useMemo(() => campaigns.filter(campaign => {
    const matchesQuery = `${campaign.name || ''} ${campaign.id || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (status === 'all' || campaign.status === status)
  }), [campaigns, query, status])
  const totals = useMemo(() => ({
    contacts: campaigns.reduce((sum, campaign) => sum + Number(campaign.total_contacts || 0), 0),
    sent: campaigns.reduce((sum, campaign) => sum + Number(campaign.sent_count || 0), 0),
    failed: campaigns.reduce((sum, campaign) => sum + Number(campaign.fail_count || 0), 0),
    active: campaigns.filter(campaign => ['running', 'pending', 'scheduled', 'paused'].includes(campaign.status)).length,
    completed: campaigns.filter(campaign => campaign.status === 'completed').length,
  }), [campaigns])
  const successRate = totals.sent + totals.failed ? Math.round((totals.sent / (totals.sent + totals.failed)) * 100) : 0
  const cards = [
    { label: 'Campanhas', value: campaigns.length, helper: `${totals.completed} concluída(s)`, Icon: FileText, color: colors.success, bg: colors.successBg },
    { label: 'Contatos alcançados', value: totals.contacts, helper: 'destinatários somados', Icon: Users, color: colors.accent2, bg: colors.surface2 },
    { label: 'Mensagens enviadas', value: totals.sent, helper: `${successRate}% sucesso`, Icon: Send, color: colors.success, bg: colors.successBg },
    { label: 'Falhas', value: totals.failed, helper: 'envios com erro', Icon: ShieldAlert, color: colors.danger, bg: colors.errorBg },
    { label: 'Em andamento', value: totals.active, helper: 'campanhas ativas', Icon: Activity, color: colors.warning, bg: colors.warningBg },
  ]

  return <div>
    <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      <div><h2 style={{ margin: 0, fontSize: 24 }}>Campanhas</h2><p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: 12 }}>Acompanhe todas as campanhas enviadas e abra os detalhes de cada operação moderada.</p></div>
      <button onClick={onNewCampaign} style={{ marginLeft: 'auto', minHeight: 44, display: 'flex', alignItems: 'center', gap: 7, padding: '0 17px', border: 0, borderRadius: 8, background: colors.accent, color: '#07120a', fontWeight: 800, cursor: 'pointer', boxShadow: `0 10px 24px ${colors.border2}` }}><Plus size={17} /> Nova campanha</button>
    </header>

    <section aria-label="Resumo das campanhas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }}>
      {cards.map(({ label, value, helper, Icon, color, bg }) => <article key={label} style={{ minHeight: 112, position: 'relative', padding: 16, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface }}><small style={{ display: 'block', maxWidth: 'calc(100% - 48px)', color: colors.textMuted, fontWeight: 700 }}>{label}</small><strong style={{ display: 'block', marginTop: 13, fontSize: 25 }}>{value}</strong><small style={{ display: 'block', marginTop: 7, color: colors.textMuted }}>{helper}</small><span style={{ position: 'absolute', right: 15, top: 15, width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 9, background: bg, color }}><Icon size={20} /></span></article>)}
    </section>

    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderBottom: `1px solid ${colors.border}` }}>
        <label style={{ minWidth: 220, flex: '0 1 326px', position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: colors.textMuted }} /><input aria-label="Buscar campanha" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar campanha..." style={{ width: '100%', minHeight: 42, padding: '0 12px 0 38px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.text }} /></label>
        <select aria-label="Filtrar status das campanhas" value={status} onChange={event => setStatus(event.target.value)} style={{ minHeight: 42, padding: '0 34px 0 12px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.text }}><option value="all">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={() => void load()} disabled={loading} style={{ marginLeft: 'auto', minHeight: 42, display: 'flex', alignItems: 'center', gap: 7, padding: '0 13px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.surface, color: colors.text, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .65 : 1 }}><RefreshCw size={15} /> {loading ? 'Atualizando…' : 'Atualizar'}</button>
      </div>
      {error && <div role="alert" style={{ padding: 14, color: colors.danger, background: colors.errorBg }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ borderBottom: `1px solid ${colors.border}` }}>{['Campanha', 'Contatos', 'Enviadas', 'Falhas', 'Status', 'Data', 'Ação'].map((label, index) => <th key={label} style={{ textAlign: index === 0 ? 'left' : 'center', padding: '12px 16px', color: colors.textMuted, fontWeight: 700 }}>{label}</th>)}</tr></thead>
        <tbody>{filtered.map(campaign => {
          const active = campaign.id === selectedId
          const processed = Number(campaign.total_contacts || 0) ? Math.min(100, Math.round(((Number(campaign.sent_count || 0) + Number(campaign.fail_count || 0)) / Number(campaign.total_contacts || 1)) * 100)) : 0
          return <tr key={campaign.id} onClick={() => setSelectedId(campaign.id)} style={{ borderBottom: `1px solid ${colors.border}`, background: active ? colors.successBg : 'transparent', cursor: 'pointer' }}><td style={{ padding: '13px 16px' }}><strong style={{ display: 'block', fontSize: 13 }}>{campaign.name}</strong><small style={{ display: 'block', marginTop: 4, color: colors.textMuted }}>ID #{String(campaign.id).slice(0, 8)} · {processed}% processada</small></td><td style={{ textAlign: 'center', fontWeight: 700 }}>{campaign.total_contacts || 0}</td><td style={{ textAlign: 'center', color: colors.success, fontWeight: 800 }}>{campaign.sent_count || 0}</td><td style={{ textAlign: 'center', color: campaign.fail_count ? colors.danger : colors.textMuted, fontWeight: 800 }}>{campaign.fail_count || 0}</td><td style={{ textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 20, background: campaign.status === 'completed' ? colors.successBg : campaign.status === 'failed' ? colors.errorBg : colors.warningBg, color: campaign.status === 'completed' ? colors.success : campaign.status === 'failed' ? colors.danger : colors.warning, fontWeight: 800 }}>{statusLabels[campaign.status] || campaign.status}</span></td><td style={{ textAlign: 'center', color: colors.textMuted }}>{formatDate(campaign.finished_at || campaign.created_at || campaign.scheduled_at)}</td><td style={{ textAlign: 'center' }}><button onClick={event => { event.stopPropagation(); setSelectedId(campaign.id) }} style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: colors.success, fontWeight: 800, cursor: 'pointer' }}>Abrir <ArrowRight size={14} /></button></td></tr>
        })}{!loading && filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: colors.textMuted }}>{campaigns.length ? 'Nenhuma campanha corresponde aos filtros.' : 'Nenhuma campanha registrada nesta conta.'}</td></tr>}</tbody>
      </table></div>
    </section>

    {selected && <section style={{ marginTop: 16, padding: 17, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Mail size={18} color={colors.success} /><div><h3 style={{ margin: 0, fontSize: 15 }}>Mensagem completa enviada</h3><small style={{ display: 'block', marginTop: 4, color: colors.textMuted }}>{selected.name} · {messages.length} destinatário(s)</small></div><button onClick={() => setSelectedId(selected.id)} style={{ marginLeft: 'auto', minHeight: 38, padding: '0 13px', border: `1px solid ${colors.success}`, borderRadius: 7, background: colors.successBg, color: colors.success, fontWeight: 800, cursor: 'pointer' }}>Abrir campanha</button></header>
      <div style={{ marginTop: 13, minHeight: 96, padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55, border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.textMuted, fontSize: 12 }}>{messages[0]?.message || 'A mensagem desta campanha ainda não está disponível.'}</div>
      {messages.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>{messages.slice(0, 8).map(message => <span key={message.id} title={message.error || ''} style={{ padding: '5px 8px', borderRadius: 20, background: message.status === 'sent' ? colors.successBg : message.status === 'failed' ? colors.errorBg : colors.surface2, color: message.status === 'sent' ? colors.success : message.status === 'failed' ? colors.danger : colors.textMuted, fontSize: 10 }}>{message.contact_name || message.phone} · {message.status === 'sent' ? 'enviada' : message.status === 'failed' ? 'falhou' : 'pendente'}</span>)}</div>}
    </section>}
  </div>
}

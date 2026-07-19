import React, { useEffect, useState } from 'react'
import { MessageCircleMore, Send } from 'lucide-react'
import SendMessage from './SendMessage'
import MassSend from './MassSend'
import { useTheme } from '../theme'

export default function SendCenter({ accountId = 'default', initialTab = 'direct' }: { accountId?: string; initialTab?: 'direct' | 'campaign' }) {
  const [tab, setTab] = useState<'direct' | 'campaign'>(initialTab)
  const [stats, setStats] = useState({ total: 0, today: 0, todaySent: 0, todayFailed: 0 })
  const [scheduled, setScheduled] = useState(0)
  const { colors } = useTheme()

  useEffect(() => {
    window.zap.getStats().then(setStats)
    window.zap.getCampaigns(accountId).then(rows => setScheduled(rows.filter((row: any) => row.status === 'scheduled').length))
  }, [accountId])
  useEffect(() => setTab(initialTab), [initialTab])

  const cards = [
    ['Total enviado', stats.total, colors.text],
    ['Enviadas hoje', stats.todaySent, colors.success],
    ['Falhas hoje', stats.todayFailed, colors.danger],
    ['Campanhas agendadas', scheduled, colors.warning],
  ]

  return <div>
    <div style={{ marginBottom: 16 }}><h2 style={{ fontSize: 20, margin: 0 }}>Central de envios</h2><p style={{ color: colors.textMuted, fontSize: 12, margin: '4px 0 0' }}>Envio individual e campanhas moderadas em uma única operação.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 9, marginBottom: 16 }}>{cards.map(([label, value, color]) => <div key={String(label)} style={{ padding: 13, background: colors.surface, border: `1px solid ${colors.border}` }}><strong style={{ display: 'block', fontSize: 22, color: String(color) }}>{String(value)}</strong><small style={{ color: colors.textMuted }}>{String(label)}</small></div>)}</div>
    <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}><button onClick={() => setTab('direct')} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '9px 14px', border: `1px solid ${tab === 'direct' ? colors.accent : colors.border}`, background: tab === 'direct' ? colors.successBg : colors.surface, color: colors.text, cursor: 'pointer', fontWeight: 700 }}><Send size={15} /> Mensagem individual</button><button onClick={() => setTab('campaign')} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '9px 14px', border: `1px solid ${tab === 'campaign' ? colors.accent : colors.border}`, background: tab === 'campaign' ? colors.successBg : colors.surface, color: colors.text, cursor: 'pointer', fontWeight: 700 }}><MessageCircleMore size={15} /> Nova campanha moderada</button></div>
    {tab === 'direct' ? <SendMessage accountId={accountId} embedded /> : <MassSend accountId={accountId} embedded composeOnly />}
  </div>
}

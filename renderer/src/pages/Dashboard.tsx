import React, { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Gauge, ShieldCheck } from 'lucide-react'
import { useTheme } from '../theme'
import LimitRecommendations from '../components/LimitRecommendations'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, today: 0, todaySent: 0, todayFailed: 0 })
  const [settings, setSettings] = useState<Record<string, string>>({})
  const { colors } = useTheme()

  useEffect(() => {
    window.zap.getStats().then(setStats)
    window.zap.getSettings().then(setSettings)
  }, [])

  const cards = [
    { label: 'Mensagens registradas', value: stats.total, color: colors.accent },
    { label: 'Movimento hoje', value: stats.today, color: colors.accent2 },
    { label: 'Respostas enviadas hoje', value: stats.todaySent, color: colors.success },
    { label: 'Falhas hoje', value: stats.todayFailed, color: colors.danger },
  ]

  const configFields = [
    { key: 'delay_min', label: 'Delay mínimo', suffix: 's' },
    { key: 'delay_max', label: 'Delay máximo', suffix: 's' },
    { key: 'pause_every', label: 'Pausar a cada', suffix: ' msg' },
    { key: 'pause_duration', label: 'Duração da pausa', suffix: 's' },
    { key: 'daily_limit', label: 'Limite diário', suffix: '/dia' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}><div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10, background: colors.successBg, color: colors.success }}><Activity size={19} /></div><div><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Visão geral</h2><p style={{ color: colors.textMuted, fontSize: 13, margin: '4px 0 0' }}>Operação WhatsApp, limites e desempenho da sua linha em um só lugar.</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 17,
            borderLeft: `4px solid ${c.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 28, fontWeight: 750 }}>{c.value}</div><Gauge size={17} color={c.color} /></div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(240px, .65fr)', gap: 14, alignItems: 'start' }}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}><ShieldCheck size={16} color={colors.accent} /><h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Limites de operação</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {configFields.map((f) => (
            <div key={f.key} style={{ background: colors.surface2, borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.accent }}>{settings[f.key] || '-'}{f.suffix}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><CheckCircle2 size={16} color={colors.success} /><strong style={{ fontSize: 13 }}>Rotina recomendada</strong></div><p style={{ color: colors.textMuted, fontSize: 12, lineHeight: 1.55, margin: 0 }}>Responda primeiro as conversas não lidas, use a IA como rascunho e finalize cada atendimento com uma próxima ação clara.</p></div>
      </div>
      <div style={{ maxWidth: 900, marginTop: 14 }}><LimitRecommendations /></div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
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
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Saúde do atendimento</h2>
      <p style={{ color: colors.textMuted, fontSize: 13, marginTop: 0, marginBottom: 20 }}>
        Visão operacional do WhatsApp conectado. Campanhas continuam disponíveis, mas o foco comercial desta versão é atendimento ao cliente.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: colors.surface, borderRadius: 8, padding: 20,
            borderLeft: `4px solid ${c.color}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: colors.surface, borderRadius: 8, padding: 20, maxWidth: 600 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Controle de campanhas moderadas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {configFields.map((f) => (
            <div key={f.key} style={{ background: colors.surface2, borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.accent }}>{settings[f.key] || '-'}{f.suffix}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 760 }}><LimitRecommendations /></div>
    </div>
  )
}

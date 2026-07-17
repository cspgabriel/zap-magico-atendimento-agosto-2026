import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTheme } from '../theme'

export default function LimitRecommendations({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme()
  const items = [
    ['Conta nova', 'até 50/dia', '60–120s'],
    ['Conta aquecida', 'até 200/dia', '30–60s'],
    ['Conta madura', 'até 500/dia', '10–30s'],
  ]
  return <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: compact ? 14 : 18, marginTop: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <ShieldCheck size={18} color={colors.accent} />
      <h3 style={{ fontSize: 14, margin: 0 }}>Recomendações de limites</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(130px, 1fr))', gap: 8 }}>
      {items.map(([name, daily, delay]) => <div key={name} style={{ background: colors.surface2, borderRadius: 7, padding: '10px 12px' }}>
        <strong style={{ display: 'block', fontSize: 12 }}>{name}</strong>
        <span style={{ display: 'block', color: colors.accent, fontWeight: 700, fontSize: 13, marginTop: 3 }}>{daily}</span>
        <small style={{ color: colors.textMuted }}>intervalo {delay}</small>
      </div>)}
    </div>
    <p style={{ color: colors.textMuted, fontSize: 11, margin: '10px 0 0' }}>Envie apenas para contatos com permissão. Faça pausa de 60s a cada 50 mensagens.</p>
  </section>
}

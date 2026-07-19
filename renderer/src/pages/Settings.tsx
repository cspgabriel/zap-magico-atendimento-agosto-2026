import React, { useEffect, useState } from 'react'
import { Bot, Check, Moon, ShieldCheck, Star } from 'lucide-react'
import { useTheme } from '../theme'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const { colors, mode, setMode } = useTheme()
  useEffect(() => { window.zap.getSettings().then(setSettings) }, [])

  function update(key: string, value: string) {
    const next = { ...settings, [key]: value }
    setSettings(next); window.zap.saveSettings({ [key]: value })
  }
  const fields = [
    { key: 'delay_min', label: 'Delay mínimo entre mensagens', unit: 'segundos' },
    { key: 'delay_max', label: 'Delay máximo entre mensagens', unit: 'segundos' },
    { key: 'pause_every', label: 'Pausar a cada', unit: 'mensagens' },
    { key: 'pause_duration', label: 'Duração da pausa', unit: 'segundos' },
    { key: 'daily_limit', label: 'Limite diário de envios', unit: 'mensagens' },
  ]
  const recommendations = [
    ['Conta nova (menos de 30 dias)', 'máx. 50 mensagens/dia, delay de 60–120s'],
    ['Conta aquecida (3–6 meses)', 'máx. 200 mensagens/dia, delay de 30–60s'],
    ['Conta madura (6+ meses)', 'máx. 500 mensagens/dia, delay de 10–30s'],
    ['Pausas automáticas', '60s a cada 50 mensagens é o padrão recomendado'],
    ['Limite diário', 'Nunca envie para mais de 500 contatos no mesmo dia'],
    ['Intervalo mínimo', 'Use no mínimo 10 segundos entre mensagens'],
  ]
  const practices = [
    'Campanhas funcionam em lotes pequenos e controlados.',
    'O anti-ban aplica intervalos aleatórios entre cada contato.',
    'Pausas programadas reduzem comportamento artificial.',
    'Evite mensagens idênticas; use variáveis como {nome}.',
    'Priorize contatos com consentimento e listas recentes.',
  ]

  const card = { border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface, padding: 21 }
  return <div>
    <header style={{ marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 24 }}>Configurações</h2><p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: 12 }}>Ajuste tema e limites conservadores das campanhas moderadas.</p></header>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(390px,.9fr) minmax(430px,1.1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 17 }}><ShieldCheck size={19} color={colors.success} /><h3 style={{ margin: 0, fontSize: 15 }}>Sistema Anti-Ban</h3></div>
          {fields.map(field => <label key={field.key} style={{ display: 'block', marginBottom: 13, color: colors.textMuted, fontSize: 11 }}><span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span>{field.label}</span><span>{field.unit}</span></span><input aria-label={field.label} type="number" min={1} value={settings[field.key] || ''} onChange={event => update(field.key, event.target.value)} style={{ width: '100%', minHeight: 44, padding: '0 11px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.text }} /></label>)}
        </section>
        <section style={card}><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}><Moon size={18} color={colors.success} /><h3 style={{ margin: 0, fontSize: 15 }}>Aparência</h3></div><small style={{ display: 'block', marginBottom: 7, color: colors.textMuted }}>Tema</small><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><button onClick={() => setMode('dark')} style={{ minHeight: 44, border: `2px solid ${mode === 'dark' ? colors.success : colors.border}`, borderRadius: 7, background: mode === 'dark' ? colors.successBg : colors.bg, color: colors.text, fontWeight: 800, cursor: 'pointer' }}>Escuro</button><button onClick={() => setMode('light')} style={{ minHeight: 44, border: `2px solid ${mode === 'light' ? colors.success : colors.border}`, borderRadius: 7, background: mode === 'light' ? colors.successBg : colors.bg, color: colors.text, fontWeight: 800, cursor: 'pointer' }}>Claro</button></div></section>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={card}><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 17 }}><Star size={19} color="#facc15" fill="#facc15" /><h3 style={{ margin: 0, fontSize: 15 }}>Recomendações de limites</h3></div><div style={{ display: 'grid', gap: 13 }}>{recommendations.map(([title, helper]) => <div key={title} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 9 }}><span style={{ width: 19, height: 19, display: 'grid', placeItems: 'center', borderRadius: '50%', background: colors.successBg, color: colors.success }}><Check size={12} /></span><div><strong style={{ display: 'block', fontSize: 12 }}>{title}</strong><small style={{ display: 'block', marginTop: 4, color: colors.textMuted }}>{helper}</small></div></div>)}</div></section>
        <section style={{ ...card, borderColor: colors.border2, background: colors.successBg }}><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 17 }}><Bot size={19} color={colors.success} /><h3 style={{ margin: 0, fontSize: 15 }}>Boas práticas da automação</h3></div><div style={{ display: 'grid', gap: 12 }}>{practices.map(item => <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'center', color: colors.textMuted, fontSize: 11 }}><Check size={14} color={colors.success} />{item}</div>)}</div></section>
      </div>
    </div>
  </div>
}

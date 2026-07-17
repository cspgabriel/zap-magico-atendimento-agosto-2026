import React, { useEffect, useState } from 'react'
import { useTheme } from '../theme'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const { colors, mode, setMode } = useTheme()

  useEffect(() => { window.zap.getSettings().then(setSettings) }, [])

  function update(key: string, value: string) {
    const s = { ...settings, [key]: value }
    setSettings(s)
    window.zap.saveSettings({ [key]: value })
  }

  const fields = [
    { key: 'delay_min', label: 'Delay mínimo entre mensagens (segundos)', type: 'number' },
    { key: 'delay_max', label: 'Delay máximo entre mensagens (segundos)', type: 'number' },
    { key: 'pause_every', label: 'Pausar a cada N mensagens', type: 'number' },
    { key: 'pause_duration', label: 'Duração da pausa (segundos)', type: 'number' },
    { key: 'daily_limit', label: 'Limite diário de envios', type: 'number' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Configurações</h2>

      <div style={{ background: colors.surface, borderRadius: 8, padding: 24, maxWidth: 500, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Sistema Anti-Ban</h3>
        {fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>{f.label}</label>
            <input type="number" value={settings[f.key] || ''}
              onChange={(e) => update(f.key, e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6,
                background: colors.bg, color: colors.text, fontSize: 14,
              }} />
          </div>
        ))}

        <div style={{ background: colors.surface2, borderRadius: 6, padding: 16, marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: colors.warning }}>Recomendações de Limites</h4>
          <ul style={{ fontSize: 12, color: colors.textMuted, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li><strong>Conta nova (menos de 30 dias):</strong> máx 50 msg/dia, delay 60-120s</li>
            <li><strong>Conta aquecida (3-6 meses):</strong> máx 200 msg/dia, delay 30-60s</li>
            <li><strong>Conta madura (6+ meses):</strong> máx 500 msg/dia, delay 10-30s</li>
            <li>Pausa de 60s a cada 50 mensagens recomendada</li>
            <li>Nunca enviar para mais de 500 contatos no mesmo dia</li>
            <li>Intervalo mínimo de 10 segundos entre mensagens</li>
          </ul>
        </div>
      </div>

      <div style={{ background: colors.surface, borderRadius: 8, padding: 24, maxWidth: 500 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: colors.accent }}>Aparência</h3>
        <label style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Tema</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('dark')} style={{
            flex: 1, padding: '10px 16px', border: mode === 'dark' ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
            borderRadius: 6, background: mode === 'dark' ? colors.surface2 : colors.bg, color: colors.text, cursor: 'pointer', fontSize: 13, fontWeight: mode === 'dark' ? 700 : 400,
          }}>
            🌙 Escuro
          </button>
          <button onClick={() => setMode('light')} style={{
            flex: 1, padding: '10px 16px', border: mode === 'light' ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
            borderRadius: 6, background: mode === 'light' ? colors.surface2 : colors.bg, color: colors.text, cursor: 'pointer', fontSize: 13, fontWeight: mode === 'light' ? 700 : 400,
          }}>
            ☀️ Claro
          </button>
        </div>
      </div>
    </div>
  )
}

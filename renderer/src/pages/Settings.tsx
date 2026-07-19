import React, { useEffect, useState } from 'react'
import { useTheme } from '../theme'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [agentApi, setAgentApi] = useState<any>(null)
  const [showToken, setShowToken] = useState(false)
  const [apiBusy, setApiBusy] = useState(false)
  const { colors, mode, setMode } = useTheme()

  useEffect(() => { window.zap.getSettings().then(setSettings); window.zap.agentApiGetConfig().then(setAgentApi) }, [])

  function update(key: string, value: string) {
    const s = { ...settings, [key]: value }
    setSettings(s)
    window.zap.saveSettings({ [key]: value })
  }
  async function saveApi(input: any) {
    setApiBusy(true)
    try { setAgentApi(await window.zap.agentApiSaveConfig(input)) } catch (error: any) { alert(error?.message || 'Falha ao configurar API.') }
    setApiBusy(false)
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

      {agentApi && <div style={{ background: colors.surface, borderRadius: 8, padding: 24, maxWidth: 760, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><div><h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: colors.accent }}>API local para agentes</h3><p style={{ color: colors.textMuted, fontSize: 11, margin: '4px 0 0' }}>Conecte agentes, n8n e scripts à conta WhatsApp ativa via endpoints autenticados.</p></div><button disabled={apiBusy} onClick={() => void saveApi({ enabled: !agentApi.enabled, port: agentApi.port })} style={{ marginLeft: 'auto', padding: '8px 12px', border: 0, background: agentApi.enabled ? colors.danger : colors.accent, color: agentApi.enabled ? '#fff' : '#07120a', fontWeight: 700, cursor: 'pointer' }}>{agentApi.enabled ? 'Desativar API' : 'Ativar API'}</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, marginTop: 15 }}><label style={{ color: colors.textMuted, fontSize: 11 }}>Porta local<input type="number" min={1024} max={65535} value={agentApi.port} onChange={e => setAgentApi({ ...agentApi, port: Number(e.target.value) })} onBlur={() => void saveApi({ enabled: agentApi.enabled, port: agentApi.port })} style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /></label><label style={{ color: colors.textMuted, fontSize: 11 }}>Base URL<input readOnly value={agentApi.baseUrl} style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /></label></div>
        <label style={{ display: 'block', color: colors.textMuted, fontSize: 11, marginTop: 10 }}>Bearer token<div style={{ display: 'flex', gap: 6, marginTop: 4 }}><input readOnly type={showToken ? 'text' : 'password'} value={agentApi.token} style={{ minWidth: 0, flex: 1, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /><button onClick={() => setShowToken(!showToken)} style={{ border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, padding: '0 10px', cursor: 'pointer' }}>{showToken ? 'Ocultar' : 'Mostrar'}</button><button onClick={() => navigator.clipboard.writeText(agentApi.token)} style={{ border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, padding: '0 10px', cursor: 'pointer' }}>Copiar</button><button onClick={() => confirm('Gerar novo token? Integrações com o token atual deixarão de funcionar.') && void saveApi({ regenerateToken: true, enabled: agentApi.enabled, port: agentApi.port })} style={{ border: `1px solid ${colors.danger}`, background: 'transparent', color: colors.danger, padding: '0 10px', cursor: 'pointer' }}>Gerar novo</button></div></label>
        <div style={{ marginTop: 12, padding: 11, background: agentApi.error ? colors.errorBg : colors.surface2, color: agentApi.error ? colors.danger : colors.textMuted, fontSize: 11 }}><strong>{agentApi.running ? '● API ativa' : agentApi.enabled ? '● API não iniciou' : '○ API desativada'}</strong>{agentApi.error ? ` · ${agentApi.error}` : ' · disponível somente em 127.0.0.1'}<br /><code>GET /health · GET /accounts · GET /inbox · POST /messages/send · POST /ai/generate</code></div>
      </div>}

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

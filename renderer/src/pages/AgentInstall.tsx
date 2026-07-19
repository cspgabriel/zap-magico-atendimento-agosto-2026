import React, { useEffect, useMemo, useState } from 'react'
import { Bot, Check, Clipboard, FileText, RefreshCw, ShieldCheck, Terminal } from 'lucide-react'
import { useTheme } from '../theme'

export default function AgentInstall({ accountId = 'default' }: { accountId?: string }) {
  const { colors } = useTheme()
  const [api, setApi] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setBusy(true); setError('')
    try {
      const [nextApi, nextStatus] = await Promise.all([window.zap.agentApiGetConfig(), window.zap.getStatus(accountId)])
      setApi(nextApi); setStatus(nextStatus)
    } catch (reason: any) { setError(reason?.message || 'Não foi possível carregar a ponte local.') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [accountId])

  async function save(input: any) {
    setBusy(true); setError('')
    try { setApi(await window.zap.agentApiSaveConfig(input)) }
    catch (reason: any) { setError(reason?.message || 'Não foi possível atualizar a API local.') }
    finally { setBusy(false) }
  }

  const prompt = useMemo(() => api ? `Você é um agente de IA autorizado a operar o WhatsApp pelo Zap Mágico instalado neste computador.

REGRA PRINCIPAL
- Envie mensagens somente pela API local do Zap Mágico, para que todo envio fique registrado no SQL local.
- Use exclusivamente a conta "${accountId}".
- Antes de enviar, confirme que a mensagem é apropriada, consentida e não parece spam.
- Normalize telefones em formato internacional, somente números. Para Brasil sem DDI, use 55.
- Nunca exponha o Bearer token em respostas, logs ou arquivos públicos.

PONTE LOCAL
- Base URL: ${api.baseUrl}
- Status da conta: GET ${api.baseUrl}/accounts/${encodeURIComponent(accountId)}/status
- Enviar mensagem: POST ${api.baseUrl}/messages/send
- Consultar Inbox: GET ${api.baseUrl}/inbox?accountId=${encodeURIComponent(accountId)}&limit=100
- Gerar texto: POST ${api.baseUrl}/ai/generate
- Gerar imagem: POST ${api.baseUrl}/ai/image
- Gerar voz: POST ${api.baseUrl}/ai/speech
- Transcrever áudio: POST ${api.baseUrl}/ai/transcribe
- Autenticação: Authorization: Bearer ${api.token}

FORMATO PARA ENVIO
POST ${api.baseUrl}/messages/send
Headers:
  Content-Type: application/json
  Authorization: Bearer ${api.token}
Body JSON:
{
  "accountId": "${accountId}",
  "to": "5521999999999",
  "message": "Olá! Sua mensagem aqui."
}

RESPOSTA ESPERADA
{ "success": true }

Se a API ou a conta não estiver conectada, não use outro serviço como fallback. Informe o erro e aguarde o operador ativar a ponte ou conectar o QR Code.` : '' , [api, accountId])
  const curl = api ? `curl -X POST "${api.baseUrl}/messages/send" -H "Content-Type: application/json" -H "Authorization: Bearer ${api.token}" -d '{"accountId":"${accountId}","to":"5521999999999","message":"Olá!"}'` : ''

  async function copy(value: string, type: string) {
    await navigator.clipboard.writeText(value)
    setCopied(type); setTimeout(() => setCopied(''), 1800)
  }
  if (!api) return <div style={{ color: colors.textMuted }}>{busy ? 'Carregando ponte local…' : error || 'API local indisponível.'}</div>
  const connected = Boolean(status?.connected)

  return <div>
    <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}><div><h2 style={{ margin: 0, fontSize: 24 }}>Instalar no agente IA</h2><p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: 12 }}>Copie o prompt para um agente usar a conta atual pela API local do próprio Zap Mágico.</p></div><button onClick={() => void load()} disabled={busy} style={{ marginLeft: 'auto', minHeight: 42, display: 'flex', gap: 7, alignItems: 'center', padding: '0 13px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.surface, color: colors.text, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}><RefreshCw size={15} /> Atualizar</button></header>
    {error && <div role="alert" style={{ marginBottom: 12, padding: 12, borderRadius: 7, color: colors.danger, background: colors.errorBg }}>{error}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,.85fr) minmax(0,1.15fr)', gap: 16, alignItems: 'start' }}>
      <section style={{ minWidth: 0, padding: 20, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Bot size={19} color={colors.success} /><h3 style={{ margin: 0, fontSize: 15 }}>Ponte local do agente</h3><span style={{ marginLeft: 'auto', color: api.running ? colors.success : colors.textMuted, fontSize: 11, fontWeight: 800 }}>{api.running ? '● ATIVA' : '○ DESATIVADA'}</span></div>
        <div style={{ marginTop: 15, padding: 14, borderRadius: 7, background: connected ? colors.successBg : colors.errorBg, color: connected ? colors.success : colors.danger }}><strong style={{ display: 'block', fontSize: 13 }}>{connected ? 'Conta WhatsApp conectada' : 'Conta WhatsApp não conectada'}</strong><small style={{ display: 'block', marginTop: 5 }}>{connected ? `${status?.phone || 'Número ativo'} · conta ${accountId}` : 'Conecte esta conta pelo QR Code antes de enviar.'}</small></div>
        <label style={{ display: 'block', marginTop: 14, color: colors.textMuted, fontSize: 11 }}>Endpoint local<input readOnly value={`${api.baseUrl}/messages/send`} style={{ width: '100%', minHeight: 44, marginTop: 5, padding: '0 11px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.text, fontFamily: 'monospace' }} /></label>
        <label style={{ display: 'block', marginTop: 11, color: colors.textMuted, fontSize: 11 }}>Token do agente<input readOnly type="password" value={api.token} style={{ width: '100%', minHeight: 44, marginTop: 5, padding: '0 11px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.text, fontFamily: 'monospace' }} /></label>
        <div style={{ marginTop: 11, padding: 13, border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, fontSize: 11, lineHeight: 1.65 }}><strong style={{ display: 'block', marginBottom: 4 }}>Conta selecionada</strong><span style={{ color: colors.textMuted }}>ID: {accountId}<br />WhatsApp: {status?.phone || 'não conectado'}<br />Acesso: somente 127.0.0.1</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}><button onClick={() => void save({ enabled: !api.enabled, port: api.port })} disabled={busy} style={{ minHeight: 42, padding: '0 13px', border: 0, borderRadius: 7, background: api.enabled ? colors.danger : colors.accent, color: api.enabled ? '#fff' : '#07120a', fontWeight: 800, cursor: 'pointer' }}>{api.enabled ? 'Desativar ponte' : 'Ativar ponte'}</button><button onClick={() => void copy(curl, 'curl')} style={{ minHeight: 42, display: 'flex', gap: 6, alignItems: 'center', padding: '0 13px', border: `1px solid ${colors.success}`, borderRadius: 7, background: colors.successBg, color: colors.success, fontWeight: 800, cursor: 'pointer' }}>{copied === 'curl' ? <Check size={15} /> : <Terminal size={15} />} {copied === 'curl' ? 'cURL copiado' : 'Copiar cURL'}</button><button onClick={() => confirm('Gerar novo token? Agentes com o token atual deixarão de funcionar.') && void save({ regenerateToken: true, enabled: api.enabled, port: api.port })} style={{ minHeight: 42, padding: '0 13px', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.surface2, color: colors.text, fontWeight: 700, cursor: 'pointer' }}>Regenerar token</button></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, color: colors.textMuted, fontSize: 10, lineHeight: 1.5 }}><ShieldCheck size={16} color={colors.success} style={{ flexShrink: 0 }} /><span>O serviço escuta somente neste computador. Não publique a porta ou o token na internet.</span></div>
      </section>
      <section style={{ minWidth: 0, padding: 20, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface }}>
        <header style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 13 }}><FileText size={19} color={colors.success} /><h3 style={{ margin: 0, fontSize: 15 }}>Prompt para instalar no agente IA</h3><button onClick={() => void copy(prompt, 'prompt')} style={{ marginLeft: 'auto', minHeight: 40, display: 'flex', alignItems: 'center', gap: 6, padding: '0 13px', border: 0, borderRadius: 7, background: colors.accent, color: '#07120a', fontWeight: 800, cursor: 'pointer' }}>{copied === 'prompt' ? <Check size={15} /> : <Clipboard size={15} />} {copied === 'prompt' ? 'Prompt copiado' : 'Copiar prompt'}</button></header>
        <pre style={{ minHeight: 520, maxHeight: 'calc(100vh - 250px)', margin: 0, padding: 15, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg, color: colors.textMuted, fontSize: 11, lineHeight: 1.65 }}>{prompt}</pre>
      </section>
    </div>
  </div>
}

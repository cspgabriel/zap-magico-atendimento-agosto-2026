import React, { useState } from 'react'
import WhatsAppEditor from '../components/WhatsAppEditor'
import { useTheme } from '../theme'
import LimitRecommendations from '../components/LimitRecommendations'
import AiMessageTools from '../components/AiMessageTools'

export default function SendMessage({ accountId = 'default', embedded = false }: { accountId?: string; embedded?: boolean }) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [sending, setSending] = useState(false)
  const { colors } = useTheme()

  async function handleSend() {
    if (!phone || !message) return
    setSending(true)
    setResult(null)
    const r = await window.zap.sendMessage(phone, message, accountId)
    setResult(r)
    setSending(false)
    if (r.success) { setPhone(''); setMessage('') }
  }

  return (
    <div>
      {!embedded && <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Enviar Mensagem</h2>}
      <div style={{ maxWidth: 600 }}>
        <label style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Telefone (com DDD, só números)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="5511999999999" maxLength={13}
          style={{ width: '100%', padding: '10px 12px', border: `1px solid ${colors.border2}`, borderRadius: 6, background: colors.surface, color: colors.text, fontSize: 14, marginBottom: 16, outline: 'none' }}
        />
        <label style={{ display: 'block', fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Mensagem</label>
        <WhatsAppEditor value={message} onChange={setMessage} placeholder="Digite sua mensagem..." />
        <AiMessageTools value={message} onChange={setMessage} />
        <button onClick={handleSend} disabled={sending || !phone || !message} style={{
          marginTop: 16, padding: '12px 32px', border: 'none', borderRadius: 6,
          background: sending ? colors.textDim : colors.accent, color: sending ? colors.textMuted : '#0f1a14',
          cursor: sending ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
        }}>
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
        {result && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: result.success ? colors.successBg : colors.errorBg, color: result.success ? colors.success : colors.danger, fontSize: 13 }}>
            {result.success ? '✓ Mensagem enviada com sucesso!' : `✗ ${result.error}`}
          </div>
        )}
        <LimitRecommendations compact />
      </div>
    </div>
  )
}

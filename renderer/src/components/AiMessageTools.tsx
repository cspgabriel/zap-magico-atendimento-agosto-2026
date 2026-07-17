import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTheme } from '../theme'

export default function AiMessageTools({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme()
  const [loading, setLoading] = useState(false)
  async function run(action: string) {
    if (!value.trim()) return
    setLoading(true)
    const result = await window.zap.aiGenerate({ text: value, action })
    setLoading(false)
    if (result.success) onChange(result.text)
    else alert(result.error)
  }
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: colors.accent, fontSize: 11, fontWeight: 700 }}><Sparkles size={14} /> IA</span>
    {[['improve', 'Melhorar'], ['shorten', 'Encurtar'], ['sales', 'Vendas'], ['support', 'Atendimento']].map(([action, label]) =>
      <button key={action} onClick={() => run(action)} disabled={loading || !value.trim()} style={{ padding: '5px 9px', border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.textMuted, cursor: 'pointer', fontSize: 11 }}>{loading ? '...' : label}</button>)}
  </div>
}

import React, { useRef } from 'react'
import { useTheme } from '../theme'

const fmt = [
  { label: 'N', title: 'Negrito *texto*', wrap: ['*', '*'], style: { fontWeight: 700 } },
  { label: 'I', title: 'Itálico _texto_', wrap: ['_', '_'], style: { fontStyle: 'italic' } },
  { label: 'T', title: 'Tachado ~texto~', wrap: ['~', '~'], style: { textDecoration: 'line-through' } },
  { label: '</>', title: 'Código ```texto```', wrap: ['```', '```'], style: { fontFamily: 'monospace', fontSize: 13 } },
]

export default function WhatsAppEditor({ value, onChange, placeholder, minRows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const { colors } = useTheme()

  function applyFormat(open: string, close: string) {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const before = value.slice(0, start), selected = value.slice(start, end), after = value.slice(end)
    const newVal = before + open + selected + close + after
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + open.length, start + open.length + selected.length)
    })
  }

  return (
    <div style={{ border: `1px solid ${colors.border2}`, borderRadius: 8, overflow: 'hidden', background: colors.surface }}>
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: `1px solid ${colors.border}`, background: colors.bg, flexWrap: 'wrap' }}>
        {fmt.map((f) => (
          <button key={f.label} title={f.title} onClick={() => applyFormat(f.wrap[0], f.wrap[1])} style={{
            width: 32, height: 32, border: `1px solid ${colors.border2}`, borderRadius: 4, background: colors.surface,
            color: colors.text, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...f.style,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = colors.surface2}
          onMouseLeave={(e) => e.currentTarget.style.background = colors.surface}
          >
            {f.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button title="Lista com marcadores" onClick={() => {
          const ta = ref.current; if (!ta) return
          const start = ta.selectionStart, end = ta.selectionEnd
          const selected = value.slice(start, end)
          const lines = selected.split('\n').map(l => l.trim() ? `• ${l}` : l).join('\n')
          const newVal = value.slice(0, start) + lines + value.slice(end)
          onChange(newVal)
        }} style={{ width: 32, height: 32, border: `1px solid ${colors.border2}`, borderRadius: 4, background: colors.surface, color: colors.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          •
        </button>
        <button title="Preview" onClick={() => {
          const ta = ref.current; if (!ta) return
          const start = ta.selectionStart
          const before = value.slice(0, start)
          const after = value.slice(start)
          const newVal = before + '\n---\n' + after
          onChange(newVal)
        }} style={{ width: 32, height: 32, border: `1px solid ${colors.border2}`, borderRadius: 4, background: colors.surface, color: colors.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ⎵
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Digite sua mensagem...'}
        rows={minRows || 6}
        style={{
          width: '100%', padding: 12, border: 'none', background: colors.surface, color: colors.text,
          fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'Segoe UI, system-ui, sans-serif', outline: 'none',
        }}
      />
      <div style={{ padding: '6px 12px', borderTop: `1px solid ${colors.border}`, fontSize: 11, color: colors.textDim, display: 'flex', gap: 16 }}>
        <span>*texto* <strong>negrito</strong></span>
        <span>_texto_ <em>itálico</em></span>
        <span>~texto~ <span style={{ textDecoration: 'line-through' }}>tachado</span></span>
        <span>```texto``` <code style={{ background: colors.surface2, padding: '0 4px', borderRadius: 2 }}>código</code></span>
      </div>
    </div>
  )
}

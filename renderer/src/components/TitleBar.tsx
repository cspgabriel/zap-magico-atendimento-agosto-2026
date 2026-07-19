import React from 'react'
import { useTheme } from '../theme'
import { Moon, Sun } from 'lucide-react'

export default function TitleBar() {
  const { colors, mode, setMode } = useTheme()

  return (
    <div id="titlebar" style={{
      height: 32, background: colors.titlebar, display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${colors.titlebarBorder}`, userSelect: 'none', flexShrink: 0,
      WebkitAppRegion: 'drag' as any,
    }}>
      <span style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginLeft: 12 }}>Zap Mágico BR</span>
      <span style={{ flex: 1 }} />
      <button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label={`Ativar tema ${mode === 'dark' ? 'claro' : 'escuro'}`} title={`Mudar para tema ${mode === 'dark' ? 'claro' : 'escuro'}`} style={{ WebkitAppRegion: 'no-drag' as any, minWidth: 86, height: 26, marginRight: 8, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${colors.border}`, borderRadius: 16, background: colors.surface, color: colors.text, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>{mode === 'dark' ? <Moon size={13} /> : <Sun size={13} />}{mode === 'dark' ? 'Escuro' : 'Claro'}</button>
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' as any }}>
        <button onClick={() => window.electron?.minimize()} title="Minimizar" style={{
          width: 46, height: 32, border: 'none', background: 'transparent', color: colors.textMuted,
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.surface}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >🗕</button>
        <button onClick={() => window.electron?.maximize()} title="Maximizar" style={{
          width: 46, height: 32, border: 'none', background: 'transparent', color: colors.textMuted,
          cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.surface}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >🗖</button>
        <button onClick={() => window.electron?.close()} title="Fechar" style={{
          width: 46, height: 32, border: 'none', background: 'transparent', color: colors.textMuted,
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger; e.currentTarget.style.color = 'white' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.textMuted }}
        >✕</button>
      </div>
    </div>
  )
}

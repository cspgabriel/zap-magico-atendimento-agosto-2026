import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface ThemeColors {
  bg: string
  sidebar: string
  surface: string
  surface2: string
  border: string
  border2: string
  text: string
  textMuted: string
  textDim: string
  accent: string
  accent2: string
  warning: string
  warningBg: string
  danger: string
  success: string
  successBg: string
  errorBg: string
  titlebar: string
  titlebarBorder: string
}

const dark: ThemeColors = {
  bg: '#0a0a0f',
  sidebar: '#0d0d14',
  surface: '#111119',
  surface2: '#171720',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(0,255,136,0.22)',
  text: '#f2f2f7',
  textMuted: '#9b9baa',
  textDim: '#686878',
  accent: '#00ff88',
  accent2: '#00d4ff',
  warning: '#f59e0b',
  warningBg: '#3b2a0a',
  danger: '#ef4444',
  success: '#00ff88',
  successBg: 'rgba(0,255,136,0.10)',
  errorBg: '#7f1d1d',
  titlebar: '#08080c',
  titlebarBorder: 'rgba(255,255,255,0.07)',
}

const light: ThemeColors = {
  bg: '#f5f6fa',
  sidebar: '#ffffff',
  surface: '#ffffff',
  surface2: '#f1f3f7',
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,204,122,0.25)',
  text: '#1a1a2e',
  textMuted: '#6b7280',
  textDim: '#9298a5',
  accent: '#00cc7a',
  accent2: '#0099ff',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  success: '#16a34a',
  successBg: '#dcfce7',
  errorBg: '#fecaca',
  titlebar: '#ffffff',
  titlebarBorder: 'rgba(0,0,0,0.08)',
}

interface ThemeContextType {
  mode: 'dark' | 'light'
  colors: ThemeColors
  setMode: (m: 'dark' | 'light') => void
}

const ThemeContext = createContext<ThemeContextType>({ mode: 'light', colors: light, setMode: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    window.zap.getSettings().then((s) => {
      if (s.lightThemeDefaultV1 !== 'applied') {
        setModeState('light')
        window.zap.saveSettings({ theme: 'light', lightThemeDefaultV1: 'applied' })
        return
      }
      if (s.theme === 'light' || s.theme === 'dark') setModeState(s.theme)
    })
  }, [])

  const setMode = useCallback((m: 'dark' | 'light') => {
    setModeState(m)
    window.zap.saveSettings({ theme: m })
  }, [])

  const colors = mode === 'dark' ? dark : light

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

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
  bg: '#f3f6f7',
  sidebar: '#ffffff',
  surface: '#ffffff',
  surface2: '#edf3f3',
  border: '#dce6e7',
  border2: 'rgba(16,185,129,0.34)',
  text: '#102a2b',
  textMuted: '#607274',
  textDim: '#8b9a9c',
  accent: '#10b981',
  accent2: '#0f766e',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  success: '#138a63',
  successBg: '#dff7ec',
  errorBg: '#fecaca',
  titlebar: '#ffffff',
  titlebarBorder: '#dce6e7',
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

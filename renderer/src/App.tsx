import React, { useState, useEffect, useCallback } from 'react'
import { toDataURL } from 'qrcode'
import { ThemeProvider, useTheme } from './theme'
import Dashboard from './pages/Dashboard'
import SendMessage from './pages/SendMessage'
import MassSend from './pages/MassSend'
import Contacts from './pages/Contacts'
import Templates from './pages/Templates'
import Inbox from './pages/Inbox'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import AiAssistant from './pages/AiAssistant'
import TitleBar from './components/TitleBar'
import { Activity, BarChart3, BookOpenText, Bot, ContactRound, Gauge, MessageCircleMore, MessagesSquare, PlugZap, Send, Settings as SettingsIcon, Unplug, UsersRound } from 'lucide-react'

declare global {
  interface Window {
    electron?: { minimize: () => void; maximize: () => void; close: () => void }
    zap: {
      connect: () => Promise<any>
      disconnect: () => Promise<any>
      getStatus: () => Promise<any>
      sendMessage: (phone: string, message: string) => Promise<any>
      startCampaign: (campaignId: string) => Promise<any>
      getContacts: () => Promise<any[]>
      addContact: (c: any) => Promise<any>
      deleteContact: (id: string) => Promise<any>
      importCSV: () => Promise<any>
      clearContacts: () => Promise<any>
      getTemplates: () => Promise<any[]>
      saveTemplate: (t: any) => Promise<any>
      deleteTemplate: (id: string) => Promise<any>
      getCampaigns: () => Promise<any[]>
      createCampaign: (c: any) => Promise<any>
      getCampaignMessages: (id: string) => Promise<any[]>
      updateCampaign: (c: any) => Promise<any>
      deleteCampaign: (id: string) => Promise<any>
      getSendLog: (days?: number) => Promise<any[]>
      getStats: () => Promise<any>
      getSettings: () => Promise<Record<string, string>>
      saveSettings: (s: Record<string, string>) => Promise<any>
      getInbox: (unreadOnly?: boolean) => Promise<any[]>
      markRead: (id: string) => Promise<any>
      markAllRead: () => Promise<any>
      getUnreadCount: () => Promise<number>
      getConversationMeta: () => Promise<any[]>
      saveConversationMeta: (input: any) => Promise<any>
      aiGetConfig: () => Promise<any>
      aiSaveConfig: (input: any) => Promise<any>
      aiGenerate: (input: any) => Promise<any>
      aiListModels: (provider: string) => Promise<any>
      aiListKnowledge: () => Promise<any[]>
      aiImportKnowledge: () => Promise<any>
      aiDeleteKnowledge: (name: string) => Promise<any[]>
      openExternal: (url: string) => Promise<any>
      on: (channel: string, cb: (...args: any[]) => void) => () => void
    }
  }
}

type Page = 'dashboard' | 'send' | 'mass' | 'contacts' | 'templates' | 'inbox' | 'reports' | 'ai' | 'settings'

function AppContent() {
  const [page, setPage] = useState<Page>(() => localStorage.getItem('zap-ai-guide-seen-v2') ? 'inbox' : 'ai')
  const [waConnected, setWaConnected] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [waStatus, setWaStatus] = useState<string>('disconnected')
  const [unread, setUnread] = useState(0)
  const [aiNotice, setAiNotice] = useState<{ success: boolean; text: string } | null>(null)
  const { colors, mode } = useTheme()

  const genQr = useCallback(async (raw: string) => {
    try {
      const url = await toDataURL(raw, { margin: 1, width: 300, color: { dark: '#000', light: '#fff' } })
      setQrCode(url)
    } catch {
      setQrCode(raw)
    }
  }, [])

  useEffect(() => {
    const unsub1 = window.zap.on('wa:qr', (data) => { genQr(data.qr); setWaStatus('connecting') })
    const unsub2 = window.zap.on('wa:status', (data) => {
      setWaStatus(data.status)
      if (data.status === 'connected') {
        setWaConnected(true)
        setWaPhone(data.phone || '')
        setQrCode('')
      } else {
        setWaConnected(false)
        setWaPhone('')
        if (data.status === 'disconnected') setQrCode('')
      }
    })
    const unsub3 = window.zap.on('inbox:new', () => {
      window.zap.getUnreadCount().then(setUnread)
    })
    const unsub4 = window.zap.on('ai:auto-reply', (data) => {
      const text = data.success ? 'Resposta automática enviada no privado.' : `IA não respondeu: ${data.error || 'verifique a configuração.'}`
      setAiNotice({ success: Boolean(data.success), text })
      window.setTimeout(() => setAiNotice(null), 6000)
    })
    const syncStatus = () => window.zap.getStatus().then((status) => {
      if (status.connected) {
        setWaConnected(true)
        setWaStatus('connected')
        setWaPhone(status.phone || '')
        setQrCode('')
      }
    })
    syncStatus()
    const statusTimer = setTimeout(syncStatus, 2500)
    window.zap.getUnreadCount().then(setUnread)
    return () => { clearTimeout(statusTimer); unsub1(); unsub2(); unsub3(); unsub4() }
  }, [])

  const handleConnect = () => {
    setPage('dashboard')
    if (!waConnected) window.zap.connect()
  }

  const nav = [
    { id: 'inbox' as Page, label: 'Atendimento', icon: MessagesSquare, badge: unread, group: 'Operação' },
    { id: 'contacts' as Page, label: 'Clientes', icon: UsersRound },
    { id: 'templates' as Page, label: 'Respostas prontas', icon: BookOpenText },
    { id: 'send' as Page, label: 'Mensagem direta', icon: Send, group: 'Envios' },
    { id: 'mass' as Page, label: 'Campanhas moderadas', icon: MessageCircleMore },
    { id: 'reports' as Page, label: 'Relatórios', icon: BarChart3, group: 'Gestão' },
    { id: 'ai' as Page, label: 'Assistente IA', icon: Bot },
    { id: 'dashboard' as Page, label: 'Saúde do atendimento', icon: Activity },
    { id: 'settings' as Page, label: 'Configurações', icon: SettingsIcon, group: 'Sistema' },
  ]

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    send: <SendMessage />,
    mass: <MassSend />,
    inbox: <Inbox />,
    contacts: <Contacts />,
    templates: <Templates />,
    reports: <Reports />,
    ai: <AiAssistant />,
    settings: <Settings />,
  }

  const statusColors: Record<string, string> = {
    connected: colors.success,
    connecting: colors.warning,
    disconnected: colors.danger,
  }

  const statusLabels: Record<string, string> = {
    connected: waPhone ? `Conectado (${waPhone})` : 'Conectado',
    connecting: 'Conectando...',
    disconnected: 'Desconectado',
  }

  return (
    <div className={`app-shell ${mode}`} style={{ color: colors.text, background: colors.bg }}>
      <TitleBar />
      <div className="app-frame">
      <nav className="sidebar" style={{ background: colors.sidebar, borderColor: colors.border }}>
        <div className="brand-block" style={{ borderColor: colors.border }}>
          <div className="brand-mark"><PlugZap size={21} strokeWidth={2.4} /></div>
          <div className="brand-copy">
            <h1>Zap Mágico</h1>
            <span>WPP WEB QR</span>
          </div>
        </div>

        <div className="connection-pill" style={{ borderColor: colors.border, background: colors.surface }}>
          <span className="status-dot" style={{ background: statusColors[waStatus], boxShadow: `0 0 12px ${statusColors[waStatus]}` }} />
          <div><small>CONEXÃO WHATSAPP</small><strong>{statusLabels[waStatus]}</strong></div>
        </div>

        {waStatus === 'connecting' && qrCode && (
          <div className="qr-panel" style={{ borderColor: colors.border }}>
            <div className="qr-label"><Gauge size={14} /> Escaneie para conectar</div>
            <div className="qr-frame"><img src={qrCode} alt="QR Code do WhatsApp" /></div>
            <p>WhatsApp › Aparelhos conectados</p>
            <small>Conexão direta e privada</small>
          </div>
        )}

        {waStatus === 'connected' && (
          <div className="phone-card" style={{ background: colors.successBg, borderColor: colors.border2 }}>
            <ContactRound size={17} color={colors.success} />
            <div><small>Linha ativa</small><strong>{waPhone || 'Número conectado'}</strong></div>
          </div>
        )}

        <div className="nav-label">ESPAÇO DE TRABALHO</div>
        <div className="nav-list">{nav.map((n) => {
          const Icon = n.icon
          return (
          <React.Fragment key={n.id}>
            {n.group && <div className="nav-group-label">{n.group}</div>}
            <button onClick={() => setPage(n.id)} className={`nav-item ${page === n.id ? 'active' : ''}`} style={{ color: page === n.id ? colors.text : colors.textMuted }}>
              <Icon size={18} strokeWidth={1.8} /><span>{n.label}</span>{!!n.badge && <b>{n.badge}</b>}
            </button>
          </React.Fragment>
        )})}</div>

        <div className="sidebar-footer" style={{ borderColor: colors.border }}>
          {waStatus === 'disconnected' && (
            <button onClick={handleConnect} className="connect-button">
              <PlugZap size={18} /> Conectar WhatsApp
            </button>
          )}
          {waStatus === 'connected' && (
            <button onClick={() => window.zap.disconnect()} className="disconnect-button" style={{ color: colors.danger, borderColor: colors.danger }}>
              <Unplug size={17} /> Desconectar
            </button>
          )}
          {waStatus === 'connecting' && (
            <div className="connecting-text" style={{ color: colors.warning }}>
              <span className="loader" /> Preparando conexão...
            </div>
          )}
        </div>
      </nav>

      <main className="main-content">
        <div className="page-wrap">
          {pages[page]}
        </div>
      </main>
      {aiNotice && <div role="status" style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 1100, maxWidth: 360, padding: '12px 15px', border: `1px solid ${aiNotice.success ? colors.border2 : colors.danger}`, background: colors.surface, color: aiNotice.success ? colors.success : colors.danger, boxShadow: '0 10px 30px rgba(15,23,42,.16)', fontSize: 12, fontWeight: 700 }}>{aiNotice.text}</div>}
    </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

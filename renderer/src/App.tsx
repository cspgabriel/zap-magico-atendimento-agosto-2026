import React, { useState, useEffect, useCallback } from 'react'
import { toDataURL } from 'qrcode'
import { ThemeProvider, useTheme } from './theme'
import Dashboard from './pages/Dashboard'
import SendCenter from './pages/SendCenter'
import Contacts from './pages/Contacts'
import Templates from './pages/Templates'
import Inbox from './pages/Inbox'
import Reports from './pages/Reports'
import Campaigns from './pages/Campaigns'
import AgentInstall from './pages/AgentInstall'
import Settings from './pages/Settings'
import AiAssistant from './pages/AiAssistant'
import Warmup from './pages/Warmup'
import Automations from './pages/Automations'
import Pipeline from './pages/Pipeline'
import TitleBar from './components/TitleBar'
import { Activity, BarChart3, BookOpenText, Bot, Cable, ContactRound, Flame, Gauge, GitBranch, Link2Off, Megaphone, MessagesSquare, Plus, PlugZap, Send, Settings as SettingsIcon, Trash2, Unplug, UsersRound, Workflow, X } from 'lucide-react'

declare global {
  interface Window {
    electron?: { minimize: () => void; maximize: () => void; close: () => void }
    zap: {
      connect: (accountId?: string) => Promise<any>
      disconnect: (accountId?: string) => Promise<any>
      unlink: (accountId?: string) => Promise<any>
      getStatus: (accountId?: string) => Promise<any>
      getAccounts: () => Promise<any[]>
      createAccount: (name: string) => Promise<any>
      renameAccount: (id: string, name: string) => Promise<any>
      deleteAccount: (id: string) => Promise<any>
      sendMessage: (phone: string, message: string, accountId?: string) => Promise<any>
      startCampaign: (campaignId: string) => Promise<any>
      getContacts: () => Promise<any[]>
      addContact: (c: any) => Promise<any>
      deleteContact: (id: string) => Promise<any>
      importCSV: () => Promise<any>
      clearContacts: () => Promise<any>
      getTemplates: () => Promise<any[]>
      saveTemplate: (t: any) => Promise<any>
      deleteTemplate: (id: string) => Promise<any>
      getCampaigns: (accountId?: string) => Promise<any[]>
      createCampaign: (c: any) => Promise<any>
      getCampaignMessages: (id: string) => Promise<any[]>
      updateCampaign: (c: any) => Promise<any>
      deleteCampaign: (id: string) => Promise<any>
      getSendLog: (days?: number) => Promise<any[]>
      getStats: () => Promise<any>
      getSettings: () => Promise<Record<string, string>>
      saveSettings: (s: Record<string, string>) => Promise<any>
      getInbox: (unreadOnly?: boolean, accountId?: string) => Promise<any[]>
      markRead: (id: string) => Promise<any>
      markAllRead: (accountId?: string) => Promise<any>
      getUnreadCount: (accountId?: string) => Promise<number>
      getConversationMeta: (accountId?: string) => Promise<any[]>
      saveConversationMeta: (input: any) => Promise<any>
      getAutomations: () => Promise<any[]>
      saveAutomation: (rule: any) => Promise<any>
      deleteAutomation: (id: string) => Promise<any>
      getDeals: (accountId?: string) => Promise<any[]>
      saveDeal: (deal: any) => Promise<any>
      deleteDeal: (id: string) => Promise<any>
      aiGetConfig: (accountId?: string) => Promise<any>
      aiSaveConfig: (accountId: string, input: any) => Promise<any>
      aiGenerate: (accountId: string, input: any) => Promise<any>
      aiListModels: (accountId: string, provider: string) => Promise<any>
      aiListMediaModels: (accountId: string, kind: 'image' | 'voice' | 'transcription', provider?: string) => Promise<any>
      aiGenerateImage: (accountId: string, prompt: string, overrides?: any) => Promise<any>
      aiGenerateSpeech: (accountId: string, text: string, overrides?: any) => Promise<any>
      aiGenerateWhatsAppSpeech: (accountId: string, text: string, overrides?: any) => Promise<any>
      aiTranscribeAudio: (accountId: string, base64: string, format?: string) => Promise<any>
      aiMediaUsage: (accountId?: string) => Promise<any>
      aiAccessCandidates: (accountId?: string) => Promise<any>
      aiListKnowledge: (accountId?: string) => Promise<any[]>
      aiImportKnowledge: (accountId?: string) => Promise<any>
      aiDeleteKnowledge: (accountId: string, name: string) => Promise<any[]>
      agentApiGetConfig: () => Promise<any>
      agentApiSaveConfig: (input: any) => Promise<any>
      openExternal: (url: string) => Promise<any>
      warmupPlans: () => Promise<any[]>
      warmupList: () => Promise<any[]>
      warmupLogs: (taskId: string, limit?: number) => Promise<any[]>
      warmupPairs: (taskId: string) => Promise<any[]>
      warmupCreate: (input: any) => Promise<any>
      warmupStart: (taskId: string) => Promise<any>
      warmupPause: (taskId: string) => Promise<any>
      warmupStop: (taskId: string) => Promise<any>
      warmupReset: (taskId: string) => Promise<any>
      warmupDelete: (taskId: string) => Promise<any>
      on: (channel: string, cb: (...args: any[]) => void) => () => void
    }
  }
}

type Page = 'dashboard' | 'send' | 'campaigns' | 'contacts' | 'templates' | 'inbox' | 'reports' | 'agent-install' | 'ai' | 'warmup' | 'automations' | 'pipeline' | 'settings'

function AppContent() {
  const [page, setPage] = useState<Page>(() => localStorage.getItem('zap-ai-guide-seen-v2') ? 'inbox' : 'ai')
  const [sendTab, setSendTab] = useState<'direct' | 'campaign'>('direct')
  const [waConnected, setWaConnected] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [waStatus, setWaStatus] = useState<string>('disconnected')
  const [unread, setUnread] = useState(0)
  const [aiNotice, setAiNotice] = useState<{ success: boolean; text: string } | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountId, setAccountId] = useState(() => localStorage.getItem('zap-active-account') || 'default')
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [accountBusy, setAccountBusy] = useState('')
  const [connectionError, setConnectionError] = useState('')
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
    const unsub1 = window.zap.on('wa:qr', (data) => { if ((data.accountId || 'default') === accountId) { genQr(data.qr); setWaStatus('connecting') } })
    const unsub2 = window.zap.on('wa:status', (data) => {
      if ((data.accountId || 'default') !== accountId) return
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
      window.zap.getAccounts().then(setAccounts)
    })
    const unsub3 = window.zap.on('inbox:new', (data) => {
      if ((data.accountId || 'default') === accountId) window.zap.getUnreadCount(accountId).then(setUnread)
    })
    const unsub4 = window.zap.on('ai:auto-reply', (data) => {
      const text = data.success ? 'Resposta automática enviada.' : `IA não respondeu: ${data.error || 'verifique a configuração.'}`
      setAiNotice({ success: Boolean(data.success), text })
      window.setTimeout(() => setAiNotice(null), 6000)
    })
    const syncStatus = () => window.zap.getStatus(accountId).then((status) => {
      if (status.connected) {
        setWaConnected(true)
        setWaStatus('connected')
        setWaPhone(status.phone || '')
        setQrCode('')
      } else {
        setWaConnected(false)
        setWaStatus(status.status || 'disconnected')
        setWaPhone('')
      }
    })
    syncStatus()
    const statusTimer = setTimeout(syncStatus, 2500)
    window.zap.getUnreadCount(accountId).then(setUnread)
    window.zap.getAccounts().then(setAccounts)
    return () => { clearTimeout(statusTimer); unsub1(); unsub2(); unsub3(); unsub4() }
  }, [accountId])

  const handleConnect = async (targetAccountId = accountId) => {
    setPage('dashboard')
    setConnectionError('')
    try {
      setWaStatus('connecting')
      const result = await window.zap.connect(targetAccountId)
      if (!result?.success) throw new Error(result?.error || 'Falha ao iniciar conexão')
    } catch (e: any) {
      setWaStatus('disconnected')
      setConnectionError(e?.message || 'Falha ao conectar WhatsApp')
    }
  }

  const handleCreateAccount = async () => {
    const name = newAccountName.trim()
    if (!name || accountBusy) return
    setAccountBusy('create')
    setConnectionError('')
    try {
      const created = await window.zap.createAccount(name)
      if (!created?.success || !created.id) throw new Error(created?.error || 'Não foi possível criar a conta')
      const next = await window.zap.getAccounts()
      setAccounts(next)
      setAccountId(created.id)
      localStorage.setItem('zap-active-account', created.id)
      setNewAccountName('')
      setAccountsOpen(false)
      setPage('dashboard')
      setWaConnected(false)
      setWaStatus('connecting')
      const connected = await window.zap.connect(created.id)
      if (!connected?.success) throw new Error(connected?.error || 'Não foi possível gerar o QR Code')
    } catch (e: any) {
      setWaStatus('disconnected')
      setConnectionError(e?.message || 'Falha ao adicionar conta')
    } finally { setAccountBusy('') }
  }

  const handleDisconnect = async () => {
    if (accountBusy) return
    setAccountBusy(accountId)
    const result = await window.zap.disconnect(accountId)
    setAccountBusy('')
    if (!result?.success) { setConnectionError(result?.error || 'Falha ao desconectar'); return }
    setWaConnected(false); setWaStatus('disconnected'); setWaPhone(''); setQrCode('')
    setAccounts(await window.zap.getAccounts())
  }

  const handleUnlink = async (id: string) => {
    const account = accounts.find(item => item.id === id)
    if (!confirm(`Desvincular ${account?.name || 'esta conta'}? Será necessário ler um novo QR Code para conectar novamente. O histórico de mensagens será mantido.`)) return
    setAccountBusy(id)
    const result = await window.zap.unlink(id)
    setAccountBusy('')
    if (!result?.success) { setConnectionError(result?.error || 'Falha ao desvincular'); return }
    if (id === accountId) { setWaConnected(false); setWaStatus('disconnected'); setWaPhone(''); setQrCode('') }
    setAccounts(await window.zap.getAccounts())
  }

  const handleDeleteAccount = async (id: string) => {
    const account = accounts.find(item => item.id === id)
    if (id === 'default' || !confirm(`Excluir o acesso à conta “${account?.name || 'WhatsApp'}” deste aplicativo?`)) return
    setAccountBusy(id)
    const result = await window.zap.deleteAccount(id)
    setAccountBusy('')
    if (!result?.success) { setConnectionError(result?.error || 'Falha ao excluir conta'); return }
    if (accountId === id) { setAccountId('default'); localStorage.setItem('zap-active-account', 'default') }
    setAccounts(await window.zap.getAccounts())
  }

  const nav = [
    { id: 'inbox' as Page, label: 'Atendimento', icon: MessagesSquare, badge: unread, group: 'Operação' },
    { id: 'contacts' as Page, label: 'Clientes', icon: UsersRound },
    { id: 'templates' as Page, label: 'Respostas prontas', icon: BookOpenText },
    { id: 'pipeline' as Page, label: 'Pipeline CRM', icon: GitBranch },
    { id: 'automations' as Page, label: 'Automações', icon: Workflow },
    { id: 'send' as Page, label: 'Central de envios', icon: Send, group: 'Envios' },
    { id: 'campaigns' as Page, label: 'Campanhas', icon: Megaphone },
    { id: 'reports' as Page, label: 'Histórico de envios', icon: BarChart3 },
    { id: 'agent-install' as Page, label: 'Instalar no agente IA', icon: Cable },
    { id: 'ai' as Page, label: 'Assistente IA', icon: Bot },
    { id: 'warmup' as Page, label: 'Aquecimento', icon: Flame },
    { id: 'dashboard' as Page, label: 'Saúde do atendimento', icon: Activity },
    { id: 'settings' as Page, label: 'Configurações', icon: SettingsIcon, group: 'Sistema' },
  ]

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    send: <SendCenter accountId={accountId} initialTab={sendTab} />,
    campaigns: <Campaigns accountId={accountId} onNewCampaign={() => { setSendTab('campaign'); setPage('send') }} />,
    inbox: <Inbox accountId={accountId} />,
    contacts: <Contacts />,
    templates: <Templates />,
    reports: <Reports accountId={accountId} />,
    'agent-install': <AgentInstall accountId={accountId} />,
    ai: <AiAssistant accountId={accountId} />,
    warmup: <Warmup />,
    automations: <Automations accountId={accountId} accounts={accounts} />,
    pipeline: <Pipeline accountId={accountId} />,
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
        <div className="account-switcher">
          <select value={accountId} onChange={(event) => { setAccountId(event.target.value); localStorage.setItem('zap-active-account', event.target.value); setWaConnected(false); setWaStatus('disconnected') }}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.phone ? ` · ${account.phone}` : ''}</option>)}
          </select>
          <button title="Gerenciar contas WhatsApp" onClick={() => setAccountsOpen(true)}><SettingsIcon size={15} /></button>
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
            <button onClick={() => { if (n.id === 'send') setSendTab('direct'); setPage(n.id) }} className={`nav-item ${page === n.id ? 'active' : ''}`} style={{ color: page === n.id ? colors.text : colors.textMuted }}>
              <Icon size={18} strokeWidth={1.8} /><span>{n.label}</span>{!!n.badge && <b>{n.badge}</b>}
            </button>
          </React.Fragment>
        )})}</div>

        <div className="sidebar-footer" style={{ borderColor: colors.border }}>
          {waStatus === 'disconnected' && (
            <button onClick={() => void handleConnect()} className="connect-button">
              <PlugZap size={18} /> Conectar WhatsApp
            </button>
          )}
          {waStatus === 'connected' && (
            <button disabled={accountBusy === accountId} onClick={handleDisconnect} className="disconnect-button" style={{ color: colors.danger, borderColor: colors.danger }}>
              <Unplug size={17} /> {accountBusy === accountId ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
          {waStatus === 'connecting' && (
            <div className="connecting-stack" style={{ color: colors.warning }}>
              <div className="connecting-text"><span className="loader" /> Preparando conexão...</div>
              <button onClick={handleDisconnect} className="disconnect-button" style={{ color: colors.textMuted, borderColor: colors.border }}>Cancelar conexão</button>
            </div>
          )}
        </div>
      </nav>

      <main className="main-content">
        <div className="page-wrap">
          {pages[page]}
        </div>
      </main>
      {accountsOpen && <div className="account-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountsOpen(false) }}>
        <section className="account-modal" style={{ background: colors.surface, borderColor: colors.border }} role="dialog" aria-modal="true" aria-label="Contas WhatsApp">
          <header><div><span className="eyebrow">CONEXÕES POR QR CODE</span><h2>Contas WhatsApp</h2><p>Conecte, pause ou troque o número de cada operação.</p></div><button className="icon-button" onClick={() => setAccountsOpen(false)} title="Fechar"><X size={17} /></button></header>
          <div className="new-account-form"><input aria-label="Nome da nova conta" value={newAccountName} onChange={event => setNewAccountName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void handleCreateAccount() }} placeholder="Ex.: Comercial, Suporte, Unidade Centro" /><button className="primary-button" disabled={!newAccountName.trim() || accountBusy === 'create'} onClick={handleCreateAccount}><Plus size={16} /> {accountBusy === 'create' ? 'Criando...' : 'Adicionar e conectar'}</button></div>
          <div className="account-list">{accounts.map(account => {
            const connected = account.status === 'connected'
            const connecting = account.status === 'connecting'
            return <article key={account.id} className={`account-row ${account.id === accountId ? 'selected' : ''}`}>
              <span className={`account-state ${connected ? 'online' : connecting ? 'waiting' : ''}`} />
              <div><strong>{account.name}</strong><small>{connected ? `Conectado · ${account.phone || 'linha ativa'}` : connecting ? 'Aguardando leitura do QR Code' : account.phone ? `Pausado · ${account.phone}` : 'Sem número vinculado'}</small></div>
              <div className="account-row-actions">
                {!connected && !connecting && <button onClick={async () => { setAccountId(account.id); localStorage.setItem('zap-active-account', account.id); setAccountsOpen(false); setWaConnected(false); setWaStatus('disconnected'); await handleConnect(account.id) }}><PlugZap size={14} /> Conectar</button>}
                {(connected || connecting) && <button onClick={async () => { setAccountId(account.id); localStorage.setItem('zap-active-account', account.id); await window.zap.disconnect(account.id); setAccounts(await window.zap.getAccounts()); if (account.id === accountId) { setWaConnected(false); setWaStatus('disconnected'); setQrCode('') } }}><Unplug size={14} /> Pausar</button>}
                {account.phone && <button onClick={() => void handleUnlink(account.id)}><Link2Off size={14} /> Trocar número</button>}
                {account.id !== 'default' && <button className="danger" title="Excluir conta" onClick={() => void handleDeleteAccount(account.id)}><Trash2 size={14} /></button>}
              </div>
            </article>
          })}</div>
          <footer><span><b>Desconectar/Pausar</b> mantém a sessão. <b>Trocar número</b> desvincula o WhatsApp e exige novo QR.</span></footer>
        </section>
      </div>}
      {aiNotice && <div role="status" style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 1100, maxWidth: 360, padding: '12px 15px', border: `1px solid ${aiNotice.success ? colors.border2 : colors.danger}`, background: colors.surface, color: aiNotice.success ? colors.success : colors.danger, boxShadow: '0 10px 30px rgba(15,23,42,.16)', fontSize: 12, fontWeight: 700 }}>{aiNotice.text}</div>}
      {connectionError && <div role="alert" className="connection-error" style={{ background: colors.surface, color: colors.danger, borderColor: colors.danger }}><span>{connectionError}</span><button onClick={() => setConnectionError('')}><X size={14} /></button></div>}
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

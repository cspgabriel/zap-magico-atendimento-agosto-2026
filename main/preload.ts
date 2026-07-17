import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
})

contextBridge.exposeInMainWorld('zap', {
  // Conexão WhatsApp
  connect: () => ipcRenderer.invoke('wa:connect'),
  disconnect: () => ipcRenderer.invoke('wa:disconnect'),
  getStatus: () => ipcRenderer.invoke('wa:status'),

  // Envio
  sendMessage: (phone: string, message: string) =>
    ipcRenderer.invoke('send:message', phone, message),
  startCampaign: (campaignId: string) =>
    ipcRenderer.invoke('campaign:start', campaignId),

  // Contatos
  getContacts: () => ipcRenderer.invoke('contacts:list'),
  addContact: (c: any) => ipcRenderer.invoke('contacts:add', c),
  deleteContact: (id: string) => ipcRenderer.invoke('contacts:delete', id),
  importCSV: () => ipcRenderer.invoke('contacts:import'),
  clearContacts: () => ipcRenderer.invoke('contacts:clear'),

  // Templates
  getTemplates: () => ipcRenderer.invoke('templates:list'),
  saveTemplate: (t: any) => ipcRenderer.invoke('templates:save', t),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),

  // Campanhas
  getCampaigns: () => ipcRenderer.invoke('campaigns:list'),
  createCampaign: (c: any) => ipcRenderer.invoke('campaigns:create', c),
  getCampaignMessages: (id: string) => ipcRenderer.invoke('campaigns:messages', id),
  updateCampaign: (c: any) => ipcRenderer.invoke('campaigns:update', c),
  deleteCampaign: (id: string) => ipcRenderer.invoke('campaigns:delete', id),

  // Relatórios
  getSendLog: (days?: number) => ipcRenderer.invoke('reports:log', days),
  getStats: () => ipcRenderer.invoke('reports:stats'),

  // Config
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: any) => ipcRenderer.invoke('settings:save', s),
  aiGetConfig: () => ipcRenderer.invoke('ai:config:get'),
  aiSaveConfig: (input: any) => ipcRenderer.invoke('ai:config:save', input),
  aiGenerate: (input: any) => ipcRenderer.invoke('ai:generate', input),
  aiListModels: (provider: string) => ipcRenderer.invoke('ai:models', provider),
  aiListKnowledge: () => ipcRenderer.invoke('ai:knowledge:list'),
  aiImportKnowledge: () => ipcRenderer.invoke('ai:knowledge:import'),
  aiDeleteKnowledge: (name: string) => ipcRenderer.invoke('ai:knowledge:delete', name),
  openExternal: (url: string) => ipcRenderer.invoke('external:open', url),

  // Caixa de Entrada
  getInbox: (unreadOnly?: boolean) => ipcRenderer.invoke('inbox:list', unreadOnly),
  markRead: (id: string) => ipcRenderer.invoke('inbox:markRead', id),
  markAllRead: () => ipcRenderer.invoke('inbox:markAllRead'),
  getUnreadCount: () => ipcRenderer.invoke('inbox:unreadCount'),
  getConversationMeta: () => ipcRenderer.invoke('inbox:conversationMeta'),
  saveConversationMeta: (input: any) => ipcRenderer.invoke('inbox:saveConversationMeta', input),

  // Eventos (main -> renderer)
  on: (channel: string, cb: (...args: any[]) => void) => {
    const handler = (_: any, ...args: any[]) => cb(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})

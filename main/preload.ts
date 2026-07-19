import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
})

contextBridge.exposeInMainWorld('zap', {
  // Conexão WhatsApp
  connect: (accountId?: string) => ipcRenderer.invoke('wa:connect', accountId),
  disconnect: (accountId?: string) => ipcRenderer.invoke('wa:disconnect', accountId),
  unlink: (accountId?: string) => ipcRenderer.invoke('wa:unlink', accountId),
  getStatus: (accountId?: string) => ipcRenderer.invoke('wa:status', accountId),
  getAccounts: () => ipcRenderer.invoke('accounts:list'),
  createAccount: (name: string) => ipcRenderer.invoke('accounts:create', name),
  renameAccount: (id: string, name: string) => ipcRenderer.invoke('accounts:rename', id, name),
  deleteAccount: (id: string) => ipcRenderer.invoke('accounts:delete', id),

  // Envio
  sendMessage: (phone: string, message: string, accountId?: string) =>
    ipcRenderer.invoke('send:message', phone, message, accountId),
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
  getCampaigns: (accountId?: string) => ipcRenderer.invoke('campaigns:list', accountId),
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
  aiGetConfig: (accountId?: string) => ipcRenderer.invoke('ai:config:get', accountId),
  aiSaveConfig: (accountId: string, input: any) => ipcRenderer.invoke('ai:config:save', accountId, input),
  aiGenerate: (accountId: string, input: any) => ipcRenderer.invoke('ai:generate', accountId, input),
  aiListModels: (accountId: string, provider: string) => ipcRenderer.invoke('ai:models', accountId, provider),
  aiListMediaModels: (accountId: string, kind: 'image' | 'voice' | 'transcription', provider?: string) => ipcRenderer.invoke('ai:media:models', accountId, kind, provider),
  aiGenerateImage: (accountId: string, prompt: string, overrides?: any) => ipcRenderer.invoke('ai:media:image', accountId, prompt, overrides),
  aiGenerateSpeech: (accountId: string, text: string, overrides?: any) => ipcRenderer.invoke('ai:media:speech', accountId, text, overrides),
  aiTranscribeAudio: (accountId: string, base64: string, format?: string) => ipcRenderer.invoke('ai:media:transcribe', accountId, base64, format),
  aiMediaUsage: (accountId?: string) => ipcRenderer.invoke('ai:media:usage', accountId),
  aiAccessCandidates: (accountId?: string) => ipcRenderer.invoke('ai:access:candidates', accountId),
  aiListKnowledge: (accountId?: string) => ipcRenderer.invoke('ai:knowledge:list', accountId),
  aiImportKnowledge: (accountId?: string) => ipcRenderer.invoke('ai:knowledge:import', accountId),
  aiDeleteKnowledge: (accountId: string, name: string) => ipcRenderer.invoke('ai:knowledge:delete', accountId, name),
  agentApiGetConfig: () => ipcRenderer.invoke('agent-api:config:get'),
  agentApiSaveConfig: (input: any) => ipcRenderer.invoke('agent-api:config:save', input),
  openExternal: (url: string) => ipcRenderer.invoke('external:open', url),

  // Caixa de Entrada
  getInbox: (unreadOnly?: boolean, accountId?: string) => ipcRenderer.invoke('inbox:list', unreadOnly, accountId),
  markRead: (id: string) => ipcRenderer.invoke('inbox:markRead', id),
  markAllRead: (accountId?: string) => ipcRenderer.invoke('inbox:markAllRead', accountId),
  getUnreadCount: (accountId?: string) => ipcRenderer.invoke('inbox:unreadCount', accountId),
  getConversationMeta: (accountId?: string) => ipcRenderer.invoke('inbox:conversationMeta', accountId),
  saveConversationMeta: (input: any) => ipcRenderer.invoke('inbox:saveConversationMeta', input),
  getAutomations: () => ipcRenderer.invoke('automations:list'),
  saveAutomation: (rule: any) => ipcRenderer.invoke('automations:save', rule),
  deleteAutomation: (id: string) => ipcRenderer.invoke('automations:delete', id),
  getDeals: (accountId?: string) => ipcRenderer.invoke('deals:list', accountId),
  saveDeal: (deal: any) => ipcRenderer.invoke('deals:save', deal),
  deleteDeal: (id: string) => ipcRenderer.invoke('deals:delete', id),

  // Aquecimento de Chips
  warmupPlans: () => ipcRenderer.invoke('warmup:plans'),
  warmupList: () => ipcRenderer.invoke('warmup:list'),
  warmupLogs: (taskId: string, limit?: number) => ipcRenderer.invoke('warmup:logs', taskId, limit),
  warmupPairs: (taskId: string) => ipcRenderer.invoke('warmup:pairs', taskId),
  warmupCreate: (input: any) => ipcRenderer.invoke('warmup:create', input),
  warmupStart: (taskId: string) => ipcRenderer.invoke('warmup:start', taskId),
  warmupPause: (taskId: string) => ipcRenderer.invoke('warmup:pause', taskId),
  warmupStop: (taskId: string) => ipcRenderer.invoke('warmup:stop', taskId),
  warmupReset: (taskId: string) => ipcRenderer.invoke('warmup:reset', taskId),
  warmupDelete: (taskId: string) => ipcRenderer.invoke('warmup:delete', taskId),

  // Eventos (main -> renderer)
  on: (channel: string, cb: (...args: any[]) => void) => {
    const handler = (_: any, ...args: any[]) => cb(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})

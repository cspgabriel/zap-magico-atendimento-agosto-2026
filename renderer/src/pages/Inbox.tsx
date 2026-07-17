import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, Clock3, Info, MessageCircle, Pin, Search, Send, Sparkles, Tag, UserRound, X } from 'lucide-react'
import WhatsAppEditor from '../components/WhatsAppEditor'
import { useTheme } from '../theme'

type StatusFilter = 'all' | 'open' | 'pending' | 'resolved' | 'unread'
const statusLabels: Record<string, string> = { open: 'Aberta', pending: 'Pendente', resolved: 'Resolvida' }
const priorityLabels: Record<string, string> = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }

function localDate(value: string) {
  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function timeLabel(value: string) {
  return localDate(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(value: string) {
  const date = localDate(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Inbox() {
  const [messages, setMessages] = useState<any[]>([])
  const [meta, setMeta] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedPhone, setSelectedPhone] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [query, setQuery] = useState('')
  const [messageQuery, setMessageQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { colors } = useTheme()

  async function load() {
    const [messageRows, metaRows] = await Promise.all([window.zap.getInbox(false), window.zap.getConversationMeta()])
    setMessages(messageRows)
    setMeta(Object.fromEntries(metaRows.map((row: any) => [row.phone, row])))
    setSelectedPhone(current => current || messageRows[0]?.phone || '')
  }

  useEffect(() => {
    void load()
    window.zap.getTemplates().then(setTemplates)
    const unsub = window.zap.on('inbox:new', () => void load())
    return unsub
  }, [])

  const allConversations = useMemo(() => {
    const map = new Map<string, any>()
    for (const message of messages) {
      const item = map.get(message.phone) || { phone: message.phone, name: '', messages: [], unread: 0, lastAt: message.received_at }
      item.messages.push(message)
      if (!message.from_me && !message.read) item.unread++
      if (!item.name && message.contact_name && !message.from_me) item.name = message.contact_name
      if (String(message.received_at) > String(item.lastAt)) item.lastAt = message.received_at
      map.set(message.phone, item)
    }
    return [...map.values()].map(c => ({ ...c, ...(meta[c.phone] || { status: 'open', priority: 'normal', pinned: 0, tags: '', notes: '' }) }))
  }, [messages, meta])

  const conversations = useMemo(() => allConversations
    .filter(c => filter === 'all' || (filter === 'unread' ? c.unread > 0 : c.status === filter))
    .filter(c => `${c.name} ${c.phone} ${c.messages.map((m: any) => m.message).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)
      || ({ urgent: 3, high: 2, normal: 1, low: 0 }[b.priority] - { urgent: 3, high: 2, normal: 1, low: 0 }[a.priority])
      || String(b.lastAt).localeCompare(String(a.lastAt))), [allConversations, filter, query])

  useEffect(() => {
    if (conversations.length && !conversations.some(c => c.phone === selectedPhone)) setSelectedPhone(conversations[0].phone)
  }, [conversations, selectedPhone])

  const selected = allConversations.find(c => c.phone === selectedPhone) || null
  const sortedMessages = selected ? [...selected.messages]
    .filter((m: any) => m.message.toLowerCase().includes(messageQuery.toLowerCase()))
    .sort((a: any, b: any) => String(a.received_at).localeCompare(String(b.received_at))) : []

  useEffect(() => {
    setNotes(selected?.notes || '')
    setTags(selected?.tags || '')
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
  }, [selectedPhone, messages.length])

  async function saveMeta(changes: any) {
    if (!selected) return
    const saved = await window.zap.saveConversationMeta({ phone: selected.phone, ...changes })
    setMeta(current => ({ ...current, [selected.phone]: { ...(current[selected.phone] || {}), ...saved } }))
  }

  async function markConversationRead() {
    if (!selected) return
    await Promise.all(selected.messages.filter((m: any) => !m.from_me && !m.read).map((m: any) => window.zap.markRead(m.id)))
    await load()
  }

  async function sendReply() {
    if (!selected || !replyText.trim() || sending) return
    setSending(true)
    const result = await window.zap.sendMessage(selected.phone, replyText.trim())
    setSending(false)
    if (result.success) { setReplyText(''); await markConversationRead() }
    else alert(result.error)
  }

  async function suggestReply() {
    if (!selected) return
    const context = [...selected.messages].sort((a: any, b: any) => String(a.received_at).localeCompare(String(b.received_at))).slice(-10)
      .map((m: any) => `${m.from_me ? 'Atendente' : 'Cliente'}: ${m.message}`).join('\n')
    setSuggesting(true)
    const result = await window.zap.aiGenerate({ text: context, action: 'reply' })
    setSuggesting(false)
    if (result.success) setReplyText(result.text); else alert(result.error)
  }

  const counts = {
    open: allConversations.filter(c => c.status === 'open').length,
    pending: allConversations.filter(c => c.status === 'pending').length,
    unread: allConversations.reduce((sum, c) => sum + c.unread, 0),
  }

  return <div style={{ height: 'calc(100vh - 88px)', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div><h2 style={{ fontSize: 20, margin: 0 }}>Central de Atendimento</h2><p style={{ color: colors.textMuted, fontSize: 12, margin: '3px 0 0' }}>Priorize, acompanhe e responda conversas em tempo real.</p></div>
      <button onClick={async () => { await window.zap.markAllRead(); void load() }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMuted, cursor: 'pointer', fontSize: 11 }}><CheckCheck size={15} /> Marcar lidas</button>
    </div>

    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(270px, 33%) minmax(0, 1fr)', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', background: colors.surface }}>
      <aside style={{ minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${colors.border}` }}>
        <div style={{ padding: 11, borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>{[['Abertas', counts.open], ['Pendentes', counts.pending], ['Não lidas', counts.unread]].map(([label, value]) => <div key={String(label)} style={{ padding: '7px 5px', background: colors.bg, border: `1px solid ${colors.border}`, textAlign: 'center' }}><strong style={{ display: 'block', color: colors.accent, fontSize: 13 }}>{value}</strong><small style={{ color: colors.textDim, fontSize: 8 }}>{label}</small></div>)}</div>
          <div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: colors.textDim }} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar conversa ou mensagem" style={{ width: '100%', padding: '9px 10px 9px 32px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} /></div>
          <select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)} style={{ width: '100%', marginTop: 7, padding: 7, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 11 }}><option value="all">Todas as conversas</option><option value="open">Abertas</option><option value="pending">Pendentes</option><option value="resolved">Resolvidas</option><option value="unread">Não lidas</option></select>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {!conversations.length && <div style={{ padding: 24, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>Nenhuma conversa encontrada.</div>}
          {conversations.map(c => {
            const last = [...c.messages].sort((a: any, b: any) => String(b.received_at).localeCompare(String(a.received_at)))[0]
            const priorityColor = c.priority === 'urgent' ? colors.danger : c.priority === 'high' ? '#f59e0b' : 'transparent'
            return <button key={c.phone} onClick={() => { setSelectedPhone(c.phone); setReplyText(''); setMessageQuery('') }} style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 9, alignItems: 'center', padding: '10px 11px', border: 0, borderLeft: `3px solid ${priorityColor}`, borderBottom: `1px solid ${colors.border}`, background: selectedPhone === c.phone ? colors.surface2 : 'transparent', color: colors.text, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: '50%', background: selectedPhone === c.phone ? colors.accent : colors.bg, color: selectedPhone === c.phone ? '#07120a' : colors.textMuted }}><UserRound size={17} /></span>
              <span style={{ minWidth: 0 }}><span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.phone}</strong>{c.pinned ? <Pin size={10} color={colors.accent} /> : null}</span><small style={{ display: 'block', color: colors.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last?.from_me ? 'Você: ' : ''}{last?.message}</small></span>
              <span style={{ alignSelf: 'start', textAlign: 'right' }}><small style={{ display: 'block', color: colors.textDim, fontSize: 9 }}>{timeLabel(c.lastAt)}</small><small style={{ display: 'block', color: colors.textDim, fontSize: 8, marginTop: 3 }}>{statusLabels[c.status]}</small>{c.unread > 0 && <b style={{ display: 'inline-grid', placeItems: 'center', minWidth: 18, height: 18, marginTop: 3, borderRadius: 9, background: colors.accent, color: '#07120a', fontSize: 9 }}>{c.unread}</b>}</span>
            </button>
          })}
        </div>
      </aside>

      {selected ? <section style={{ minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ minHeight: 58, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', borderBottom: `1px solid ${colors.border}` }}><span style={{ width: 35, height: 35, display: 'grid', placeItems: 'center', borderRadius: '50%', background: colors.successBg, color: colors.success }}><UserRound size={17} /></span><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name || selected.phone}</strong><small style={{ color: colors.textMuted }}>{selected.phone}</small></div><select value={selected.status} onChange={e => void saveMeta({ status: e.target.value })} style={{ marginLeft: 'auto', padding: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 10 }}><option value="open">Aberta</option><option value="pending">Pendente</option><option value="resolved">Resolvida</option></select>{selected.unread > 0 && <button onClick={markConversationRead} title="Marcar como lida" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.accent, cursor: 'pointer' }}><CheckCheck size={15} /></button>}<button onClick={() => setDetailsOpen(true)} title="Detalhes da conversa" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMuted, cursor: 'pointer' }}><Info size={15} /></button></header>
        <div style={{ padding: '6px 12px', borderBottom: `1px solid ${colors.border}`, background: colors.surface }}><div style={{ position: 'relative' }}><Search size={13} style={{ position: 'absolute', left: 8, top: 7, color: colors.textDim }} /><input value={messageQuery} onChange={e => setMessageQuery(e.target.value)} placeholder="Buscar nesta conversa" style={{ width: '100%', padding: '6px 9px 6px 27px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 10 }} /></div></div>
        <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16, background: colors.bg }}>
          {sortedMessages.map((message: any, index: number) => { const showDay = !index || dayLabel(sortedMessages[index - 1].received_at) !== dayLabel(message.received_at); return <React.Fragment key={message.id}>{showDay && <div style={{ textAlign: 'center', margin: '4px 0 12px' }}><span style={{ padding: '4px 8px', background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textDim, fontSize: 9 }}>{dayLabel(message.received_at)}</span></div>}<div style={{ display: 'flex', justifyContent: message.from_me ? 'flex-end' : 'flex-start', marginBottom: 8 }}><div style={{ maxWidth: '78%', padding: '8px 10px', borderRadius: message.from_me ? '8px 2px 8px 8px' : '2px 8px 8px 8px', background: message.from_me ? colors.successBg : colors.surface, border: `1px solid ${message.from_me ? colors.border2 : colors.border}` }}><div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message}</div><div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, color: colors.textDim, fontSize: 9, marginTop: 3 }}><Clock3 size={9} />{timeLabel(message.received_at)}{message.from_me && <CheckCheck size={11} color={colors.accent} />}</div></div></div></React.Fragment> })}
        </div>
        <footer onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') void sendReply() }} style={{ flexShrink: 0, maxHeight: '45%', overflow: 'auto', padding: 9, borderTop: `1px solid ${colors.border}`, background: colors.surface }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}><button onClick={suggestReply} disabled={suggesting} style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${colors.border2}`, background: colors.successBg, color: colors.success, padding: '6px 9px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}><Sparkles size={13} />{suggesting ? 'Analisando...' : 'Sugerir com IA'}</button>{templates.length > 0 && <select onChange={e => { if (e.target.value) setReplyText(templates.find(t => t.id === e.target.value)?.message || '') }} defaultValue="" style={{ marginLeft: 'auto', maxWidth: 180, padding: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 10 }}><option value="">Resposta pronta</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 42px', gap: 8, alignItems: 'end' }}><WhatsAppEditor value={replyText} onChange={setReplyText} placeholder="Digite ou gere uma resposta... Ctrl+Enter para enviar" minRows={1} /><button onClick={sendReply} disabled={sending || !replyText.trim()} title="Enviar resposta" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', border: 0, background: colors.accent, color: '#07120a', cursor: 'pointer' }}>{sending ? <span className="loader" /> : <Send size={18} />}</button></div>
        </footer>

        {detailsOpen && <aside style={{ position: 'absolute', zIndex: 20, inset: '0 0 0 auto', width: 'min(270px, 85%)', display: 'flex', flexDirection: 'column', background: colors.surface, borderLeft: `1px solid ${colors.border}`, boxShadow: '-16px 0 40px rgba(0,0,0,.15)' }}><header style={{ display: 'flex', alignItems: 'center', padding: 13, borderBottom: `1px solid ${colors.border}` }}><strong style={{ fontSize: 13 }}>Detalhes da conversa</strong><button onClick={() => setDetailsOpen(false)} title="Fechar" style={{ marginLeft: 'auto', width: 30, height: 30, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: colors.textMuted, cursor: 'pointer' }}><X size={16} /></button></header><div style={{ padding: 14, overflow: 'auto' }}><div style={{ textAlign: 'center', paddingBottom: 14, borderBottom: `1px solid ${colors.border}` }}><span style={{ width: 48, height: 48, display: 'inline-grid', placeItems: 'center', borderRadius: '50%', background: colors.successBg, color: colors.success }}><UserRound size={22} /></span><strong style={{ display: 'block', marginTop: 7, fontSize: 13 }}>{selected.name || selected.phone}</strong><small style={{ color: colors.textMuted }}>{selected.phone}</small></div><label style={{ display: 'block', marginTop: 14, color: colors.textMuted, fontSize: 10 }}>PRIORIDADE</label><select value={selected.priority} onChange={e => void saveMeta({ priority: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select><button onClick={() => void saveMeta({ pinned: selected.pinned ? 0 : 1 })} style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, border: `1px solid ${colors.border}`, background: selected.pinned ? colors.successBg : colors.bg, color: selected.pinned ? colors.success : colors.textMuted, cursor: 'pointer' }}><Pin size={13} />{selected.pinned ? 'Conversa fixada' : 'Fixar conversa'}</button><label style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 14, color: colors.textMuted, fontSize: 10 }}><Tag size={12} /> ETIQUETAS</label><input value={tags} onChange={e => setTags(e.target.value)} placeholder="lead, orçamento, retorno" style={{ width: '100%', marginTop: 5, padding: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} /><label style={{ display: 'block', marginTop: 12, color: colors.textMuted, fontSize: 10 }}>NOTAS INTERNAS</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Contexto, preferência e próximo passo..." style={{ width: '100%', marginTop: 5, padding: 8, resize: 'vertical', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} /><button onClick={() => void saveMeta({ tags: tags.trim(), notes: notes.trim() })} style={{ width: '100%', marginTop: 8, padding: 9, border: 0, background: colors.accent, color: '#07120a', fontWeight: 700, cursor: 'pointer' }}>Salvar detalhes</button><div style={{ marginTop: 14, padding: 10, background: colors.bg, border: `1px solid ${colors.border}` }}><small style={{ color: colors.textDim }}>STATUS</small><strong style={{ display: 'block', marginTop: 4, fontSize: 12 }}>{statusLabels[selected.status]} · prioridade {priorityLabels[selected.priority].toLowerCase()}</strong><small style={{ display: 'block', marginTop: 4, color: colors.textMuted }}>{selected.messages.length} mensagens nesta conversa</small></div></div></aside>}
      </section> : <div style={{ display: 'grid', placeItems: 'center', color: colors.textDim }}><div style={{ textAlign: 'center' }}><MessageCircle size={34} /><p style={{ fontSize: 12 }}>Selecione uma conversa</p></div></div>}
    </div>
  </div>
}

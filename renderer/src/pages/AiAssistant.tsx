import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, CheckCircle2, ExternalLink, FileAudio, FileText, HelpCircle, Image as ImageIcon, KeyRound, Mic2, RefreshCw, ShieldCheck, Sparkles, Trash2, Upload, UserRoundCheck, Users, X } from 'lucide-react'
import { useTheme } from '../theme'

const providers: Record<string, { label: string; keyUrl: string; docsUrl: string; help: string }> = {
  openrouter: { label: 'OpenRouter', keyUrl: 'https://openrouter.ai/settings/keys', docsUrl: 'https://openrouter.ai/docs/quickstart', help: 'Crie uma conta, abra Keys e gere uma nova chave.' },
  gemini: { label: 'Google Gemini', keyUrl: 'https://aistudio.google.com/app/apikey', docsUrl: 'https://ai.google.dev/gemini-api/docs/api-key', help: 'Abra o Google AI Studio e clique em Create API key.' },
  openai: { label: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys', docsUrl: 'https://platform.openai.com/docs/quickstart', help: 'Na plataforma OpenAI, abra API keys e crie uma secret key.' },
  deepseek: { label: 'DeepSeek', keyUrl: 'https://platform.deepseek.com/api_keys', docsUrl: 'https://api-docs.deepseek.com/', help: 'Acesse a plataforma DeepSeek e crie uma API key.' },
}

export default function AiAssistant({ accountId }: { accountId: string }) {
  const { colors } = useTheme()
  const [config, setConfig] = useState<any>({ provider: 'auto', providers: [] })
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [testKind, setTestKind] = useState<'text' | 'image' | 'voice'>('text')
  const [mediaPreview, setMediaPreview] = useState<{ kind: 'image' | 'voice'; url: string; detail: string } | null>(null)
  const [testImageRefs, setTestImageRefs] = useState<Array<{ name: string; url: string }>>([])
  const [testAudio, setTestAudio] = useState<{ name: string; base64: string; format: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [knowledge, setKnowledge] = useState<any[]>([])
  const [autoReply, setAutoReply] = useState(true)
  const [assistantMode, setAssistantMode] = useState<'service' | 'personal'>('service')
  const [adminNumber, setAdminNumber] = useState('')
  const [authorizedNumbers, setAuthorizedNumbers] = useState('')
  const [allowGroups, setAllowGroups] = useState(false)
  const [authorizedGroups, setAuthorizedGroups] = useState<string[]>([])
  const [responseLength, setResponseLength] = useState<'auto' | 'short' | 'medium' | 'long'>('auto')
  const [candidates, setCandidates] = useState<any>({ contacts: [], groups: [], members: [], connected: false })
  const [peopleSearch, setPeopleSearch] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [accessSaveState, setAccessSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [accessError, setAccessError] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeSection, setActiveSection] = useState<'behavior' | 'context' | 'models' | 'media' | 'test'>('behavior')
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem('zap-ai-guide-seen-v2'))
  useEffect(() => {
    let active = true
    setSaveState('idle'); setAccessSaveState('idle'); setAccessError('')
    setConfig({ provider: 'auto', providers: [] }); setSystemPrompt(''); setAutoReply(true); setAssistantMode('service'); setAdminNumber(''); setAuthorizedNumbers(''); setAllowGroups(false); setAuthorizedGroups([]); setResponseLength('auto'); setCandidates({ contacts: [], groups: [], members: [], connected: false }); setPeopleSearch(''); setSelectedPeople([]); setKnowledge([])
    window.zap.aiGetConfig(accountId).then((data) => { if (active) { setConfig(data); setSystemPrompt(data.systemPrompt || ''); setAutoReply(data.autoReply !== false); setAssistantMode(data.assistantMode || 'service'); setAdminNumber(data.adminNumber || ''); setAuthorizedNumbers((data.authorizedNumbers || []).join('\n')); setAllowGroups(Boolean(data.allowGroups)); setAuthorizedGroups(data.authorizedGroups || []); setResponseLength(data.responseLength || 'auto'); setKnowledge(data.knowledge || []) } })
    window.zap.aiAccessCandidates(accountId).then(data => { if (active) setCandidates(data || { contacts: [], groups: [], connected: false }) }).catch(() => {})
    return () => { active = false }
  }, [accountId])
  async function saveProvider(id: string, key: string, model: string) { setConfig(await window.zap.aiSaveConfig(accountId, { id, key, model })) }
  async function generate() {
    if (!prompt.trim()) return
    setLoading(true); setResult(''); setMediaPreview(null)
    try {
      if (testKind === 'image') {
        const response = await window.zap.aiGenerateImage(accountId, prompt, { inputReferences: testImageRefs.map(item => item.url) })
        if (response.success) setMediaPreview({ kind: 'image', url: `data:${response.mediaType || 'image/png'};base64,${response.base64}`, detail: `${response.model} · ${response.referenceCount || 0} referência(s)` }); else alert(response.error)
      } else if (testKind === 'voice') {
        const response = await window.zap.aiGenerateWhatsAppSpeech(accountId, prompt)
        if (response.success) setMediaPreview({ kind: 'voice', url: `data:${response.mediaType || 'audio/mpeg'};base64,${response.base64}`, detail: `${response.model} · ${response.voice}` }); else alert(response.error)
      } else {
        const response = await window.zap.aiGenerate(accountId, { text: prompt, action: 'create', provider: config.provider })
        if (response.success) setResult(response.text); else alert(response.error)
      }
    } finally { setLoading(false) }
  }
  function loadImageReferences(files: FileList | null) {
    for (const file of Array.from(files || []).slice(0, Math.max(0, 16 - testImageRefs.length))) {
      const reader = new FileReader()
      reader.onload = () => setTestImageRefs(current => [...current, { name: file.name, url: String(reader.result) }].slice(0, 16))
      reader.readAsDataURL(file)
    }
  }
  function loadTestAudio(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setTestAudio({ name: file.name, base64: String(reader.result).split(',')[1] || '', format: file.name.split('.').pop()?.toLowerCase() || 'ogg' })
    reader.readAsDataURL(file)
  }
  async function saveAutoReply(value: boolean) {
    setAutoReply(value)
    try { setConfig(await window.zap.aiSaveConfig(accountId, { autoReply: value })) } catch { setAutoReply(!value) }
  }
  async function saveAccessConfig() {
    try {
      setAccessSaveState('saving'); setAccessError('')
      const saved = await window.zap.aiSaveConfig(accountId, { assistantMode, adminNumber, authorizedNumbers: authorizedNumbers.split(/[\n,;]+/).map(value => value.trim()).filter(Boolean), allowGroups, authorizedGroups, responseLength })
      setConfig(saved); setAssistantMode(saved.assistantMode); setAdminNumber(saved.adminNumber || ''); setAuthorizedNumbers((saved.authorizedNumbers || []).join('\n')); setAllowGroups(Boolean(saved.allowGroups)); setAuthorizedGroups(saved.authorizedGroups || []); setResponseLength(saved.responseLength || 'auto')
      setAccessSaveState('saved'); setTimeout(() => setAccessSaveState('idle'), 2200)
    } catch (error: any) {
      setAccessSaveState('error'); setAccessError(error?.message || 'Não foi possível salvar.')
    }
  }
  function addAuthorizedContact(value: string) {
    if (!value) return
    const values = authorizedNumbers.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean)
    if (!values.includes(value) && value !== adminNumber) setAuthorizedNumbers([...values, value].join('\n'))
  }
  function addSelectedPeople() {
    const current = authorizedNumbers.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean)
    const next = [...new Set([...current, ...selectedPeople].filter(value => value !== adminNumber))]
    setAuthorizedNumbers(next.join('\n'))
    setSelectedPeople([])
  }
  function toggleGroup(jid: string) {
    setAuthorizedGroups(current => current.includes(jid) ? current.filter(item => item !== jid) : [...current, jid])
  }
  const peopleCandidates = useMemo(() => {
    const map = new Map<string, any>()
    for (const contact of candidates.contacts || []) map.set(contact.id, { ...contact, source: 'Conversa privada' })
    for (const member of candidates.members || []) {
      const existing = map.get(member.id)
      map.set(member.id, { ...member, name: member.name || existing?.name || member.id, source: member.group_names ? `Grupos: ${member.group_names}` : 'Participante de grupo' })
    }
    return [...map.values()]
  }, [candidates.contacts, candidates.members])
  const filteredPeople = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase()
    return peopleCandidates.filter(person => `${person.name || ''} ${person.id || ''} ${person.source || ''}`.toLowerCase().includes(query))
  }, [peopleCandidates, peopleSearch])
  return <div>
    {showGuide && <ApiGuideModal colors={colors} close={() => { localStorage.setItem('zap-ai-guide-seen-v2', '1'); setShowGuide(false) }} />}
    <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', marginBottom: 12, border: `1px solid ${colors.border2}`, borderRadius: 12, background: `linear-gradient(120deg, ${colors.successBg}, ${colors.surface} 58%)` }}>
      <div style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: colors.accent, color: '#07120a' }}><Bot size={23} /></div>
      <div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><h2 style={{ fontSize: 21, margin: 0 }}>Assistente IA</h2><span style={{ padding: '3px 7px', borderRadius: 20, background: autoReply ? colors.successBg : colors.surface2, color: autoReply ? colors.success : colors.textMuted, border: `1px solid ${autoReply ? colors.border2 : colors.border}`, fontSize: 9, fontWeight: 800 }}>{autoReply ? 'AUTOMAÇÃO ATIVA' : 'AUTOMAÇÃO PAUSADA'}</span></div><p style={{ color: colors.textMuted, fontSize: 12, margin: '4px 0 0' }}>Conta isolada: <strong data-testid="ai-account-id" style={{ color: colors.text }}>{accountId}</strong> · {assistantMode === 'service' ? 'Atendimento para todos' : 'Assistente pessoal restrito'}</p></div>
      <button onClick={() => setShowGuide(true)} style={{ marginLeft: 'auto', minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.surface, color: colors.textMuted, padding: '0 13px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}><HelpCircle size={15} /> Guia de configuração</button>
    </header>
    <nav aria-label="Seções do Assistente IA" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 7, marginBottom: 14 }}>
      {([
        ['behavior', 'Comportamento', 'Quem recebe e automação', UserRoundCheck],
        ['context', 'Contexto', 'Prompt e arquivos', FileText],
        ['models', 'Modelos e chaves', 'OpenRouter e provedores', KeyRound],
        ['media', 'Foto e voz', 'Imagem, TTS e limites', Mic2],
        ['test', 'Testar IA', 'Gere uma mensagem', Sparkles],
      ] as const).map(([id, label, helper, Icon]) => <button key={id} onClick={() => setActiveSection(id)} aria-current={activeSection === id ? 'page' : undefined} style={{ minHeight: 58, display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', padding: '9px 11px', borderRadius: 8, border: `1px solid ${activeSection === id ? colors.accent : colors.border}`, background: activeSection === id ? colors.successBg : colors.surface, color: colors.text, cursor: 'pointer', transition: 'background 180ms ease,border-color 180ms ease' }}><Icon size={17} color={activeSection === id ? colors.accent : colors.textMuted} /><span><strong style={{ display: 'block', fontSize: 11 }}>{label}</strong><small style={{ display: 'block', color: colors.textMuted, fontSize: 9, marginTop: 2 }}>{helper}</small></span></button>)}
    </nav>
    {activeSection === 'behavior' && <section style={{ marginBottom: 16, background: colors.surface, border: `1px solid ${assistantMode === 'personal' ? colors.border2 : colors.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><UserRoundCheck size={16} color={colors.accent} /><strong style={{ fontSize: 13 }}>Quem o assistente pode responder</strong><small style={{ marginLeft: 'auto', color: colors.textDim }}>Configuração da conta atual</small></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 11 }}>
        <button onClick={() => setAssistantMode('service')} style={{ textAlign: 'left', padding: 11, border: `1px solid ${assistantMode === 'service' ? colors.accent : colors.border}`, background: assistantMode === 'service' ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer' }}><Users size={16} color={colors.accent} /><strong style={{ display: 'block', marginTop: 5, fontSize: 12 }}>Modo atendimento</strong><small style={{ color: colors.textMuted }}>A IA responde todos os contatos privados.</small></button>
        <button onClick={() => setAssistantMode('personal')} style={{ textAlign: 'left', padding: 11, border: `1px solid ${assistantMode === 'personal' ? colors.accent : colors.border}`, background: assistantMode === 'personal' ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer' }}><ShieldCheck size={16} color={colors.accent} /><strong style={{ display: 'block', marginTop: 5, fontSize: 12 }}>Assistente pessoal IA</strong><small style={{ color: colors.textMuted }}>Responde somente ADMIN e números autorizados.</small></button>
      </div>
      {assistantMode === 'personal' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 10 }}>
        <div><label style={{ color: colors.textMuted, fontSize: 11 }}>Número ADMIN *<input value={adminNumber} onChange={e => setAdminNumber(e.target.value)} placeholder="Ex.: 5521999999999" style={{ display: 'block', width: '100%', marginTop: 5, padding: 9, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /></label><select aria-label="Escolher ADMIN dos chats ativos" value="" onChange={e => setAdminNumber(e.target.value)} style={{ width: '100%', marginTop: 6, padding: 8, background: colors.surface2, color: colors.text, border: `1px solid ${colors.border}` }}><option value="">Escolher ADMIN das conversas ou grupos…</option>{peopleCandidates.map((contact: any) => <option key={contact.id} value={contact.id}>{contact.name || contact.id} · {contact.id}</option>)}</select></div>
        <div><label style={{ color: colors.textMuted, fontSize: 11 }}>Outros números autorizados<textarea value={authorizedNumbers} onChange={e => setAuthorizedNumbers(e.target.value)} placeholder={'Um por linha\n5511999999999'} rows={3} style={{ display: 'block', width: '100%', marginTop: 5, padding: 9, resize: 'vertical', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /></label><select aria-label="Adicionar contato autorizado" value="" onChange={e => addAuthorizedContact(e.target.value)} style={{ width: '100%', marginTop: 6, padding: 8, background: colors.surface2, color: colors.text, border: `1px solid ${colors.border}` }}><option value="">Adicionar dos chats ativos…</option>{candidates.contacts.map((contact: any) => <option key={contact.id} value={contact.id}>{contact.name || contact.id} · {contact.id}</option>)}</select></div>
      </div>}
      {assistantMode === 'personal' && <div style={{ marginTop: 10, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={15} color={colors.accent} /><strong style={{ fontSize: 11 }}>Adicionar várias pessoas autorizadas</strong><small style={{ marginLeft: 'auto', color: colors.textMuted }}>{peopleCandidates.length} pessoa(s) encontradas</small></div>
        <input aria-label="Pesquisar pessoas autorizadas" value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} placeholder="Pesquisar nome, número ou grupo…" style={{ width: '100%', marginTop: 8, padding: 9, background: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6 }} />
        <div style={{ maxHeight: 180, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 5, marginTop: 7 }}>{filteredPeople.length ? filteredPeople.map((person: any) => <label key={person.id} style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: `1px solid ${selectedPeople.includes(person.id) ? colors.border2 : colors.border}`, borderRadius: 6, background: selectedPeople.includes(person.id) ? colors.successBg : colors.surface, cursor: 'pointer' }}><input type="checkbox" checked={selectedPeople.includes(person.id)} onChange={() => setSelectedPeople(current => current.includes(person.id) ? current.filter(id => id !== person.id) : [...current, person.id])} /><span style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{person.name || person.id}</strong><small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.textMuted, fontSize: 9 }}>{person.source} · {person.id}</small></span></label>) : <small style={{ color: colors.textMuted, padding: 8 }}>Nenhuma pessoa encontrada nesta conta.</small>}</div>
        <button onClick={addSelectedPeople} disabled={!selectedPeople.length} style={{ minHeight: 40, marginTop: 8, padding: '0 12px', border: 0, borderRadius: 7, background: selectedPeople.length ? colors.accent : colors.border, color: selectedPeople.length ? '#07120a' : colors.textMuted, fontWeight: 700, cursor: selectedPeople.length ? 'pointer' : 'not-allowed', fontSize: 11 }}>Adicionar selecionados ({selectedPeople.length})</button>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,.65fr) 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
        <div><label style={{ color: colors.textMuted, fontSize: 11 }}>Tamanho das respostas<select aria-label="Tamanho das respostas" value={responseLength} onChange={e => setResponseLength(e.target.value as any)} style={{ display: 'block', width: '100%', marginTop: 5, padding: 9, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}><option value="auto">Automático</option><option value="short">Curta · até 350 caracteres</option><option value="medium">Média · até 700 caracteres</option><option value="long">Longa · até 1.400 caracteres</option></select></label></div>
        <div><label style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.text, fontSize: 12, fontWeight: 700 }}><input type="checkbox" checked={allowGroups} onChange={e => setAllowGroups(e.target.checked)} /> Permitir IA em grupos escolhidos</label><small style={{ display: 'block', color: colors.textMuted, marginTop: 4 }}>Em cada grupo marcado, a IA responde qualquer participante. A lista de ADMIN vale somente para chats privados.</small></div>
      </div>
      {allowGroups && <div style={{ marginTop: 9, maxHeight: 170, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6, padding: 8, background: colors.bg, border: `1px solid ${colors.border}` }}>{candidates.groups.length ? candidates.groups.map((group: any) => <label key={group.id} style={{ display: 'flex', gap: 7, alignItems: 'center', padding: 7, background: colors.surface, color: colors.text, fontSize: 11 }}><input type="checkbox" checked={authorizedGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} /><span><strong style={{ display: 'block' }}>{group.name || group.id}</strong><small style={{ color: colors.textMuted }}>{group.participant_count || 0} participantes</small></span></label>) : <small style={{ color: colors.textMuted, gridColumn: '1/-1' }}>{candidates.connected ? 'Nenhum grupo encontrado nesta conta.' : 'Conecte esta conta para carregar os grupos participantes.'}</small>}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}><button onClick={() => void saveAccessConfig()} disabled={accessSaveState === 'saving'} style={{ minHeight: 40, padding: '0 13px', border: 0, borderRadius: 7, background: colors.accent, color: '#07120a', fontWeight: 700, cursor: accessSaveState === 'saving' ? 'wait' : 'pointer', fontSize: 11 }}>{accessSaveState === 'saving' ? 'Salvando...' : accessSaveState === 'saved' ? 'Configuração salva' : 'Salvar modo e permissões'}</button><small style={{ color: accessSaveState === 'error' ? colors.danger : colors.textMuted }}>{accessError || 'Aceita número, JID e LID; a conversão é automática quando o WhatsApp fornece o vínculo.'}</small></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bg }}>
        <div style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 12 }}>Resposta automática com IA</strong><small style={{ color: colors.textMuted, fontSize: 10 }}>Privado conforme o modo escolhido; grupos somente quando ativados e selecionados.</small></div>
        <button role="switch" aria-label="Resposta automática com IA" aria-checked={autoReply} onClick={() => void saveAutoReply(!autoReply)} title={autoReply ? 'Desativar resposta automática' : 'Ativar resposta automática'} style={{ width: 48, height: 28, border: 0, borderRadius: 20, padding: 4, background: autoReply ? colors.accent : colors.border, cursor: 'pointer', display: 'flex', justifyContent: autoReply ? 'flex-end' : 'flex-start', transition: 'background 180ms ease' }}><span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>
        <small style={{ width: 54, color: autoReply ? colors.success : colors.textMuted, fontWeight: 700 }}>{autoReply ? 'ATIVA' : 'PAUSADA'}</small>
      </div>
    </section>}
    {activeSection === 'context' && <section style={{ marginBottom: 16, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><FileText size={16} color={colors.accent} /><strong style={{ fontSize: 13 }}>Contexto do atendimento</strong><small style={{ marginLeft: 'auto', color: colors.textDim }}>Tudo fica neste computador</small></div>
      <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="Ex.: Somos uma agência premium. Nunca prometa prazo sem confirmar. Termine com uma pergunta objetiva." rows={3} style={{ width: '100%', marginTop: 9, resize: 'vertical', padding: 10, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, fontSize: 12 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><button onClick={async () => { try { setSaveState('saving'); const saved = await window.zap.aiSaveConfig(accountId, { systemPrompt: systemPrompt.trim() }); setConfig(saved); setSystemPrompt(saved.systemPrompt || systemPrompt); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2200) } catch { setSaveState('error') } }} disabled={saveState === 'saving'} style={{ padding: '7px 10px', border: 0, background: colors.accent, color: '#07120a', fontWeight: 700, cursor: saveState === 'saving' ? 'wait' : 'pointer', fontSize: 11 }}>{saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Instruções salvas' : saveState === 'error' ? 'Tentar novamente' : 'Salvar instruções'}</button><button onClick={async () => { const result = await window.zap.aiImportKnowledge(accountId); if (result.success) setKnowledge(result.files || []) }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', border: `1px solid ${colors.border2}`, background: colors.surface2, color: colors.text, cursor: 'pointer', fontSize: 11 }}><FileText size={13} /> Adicionar arquivos</button><small style={{ color: saveState === 'error' ? colors.danger : saveState === 'saved' ? colors.success : colors.textMuted }}>{saveState === 'error' ? 'Não foi possível salvar localmente.' : saveState === 'saved' ? 'Persistido nesta conta.' : `${knowledge.length} arquivo(s) de contexto desta conta`}</small></div>
      {knowledge.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>{knowledge.map(file => <span key={file.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 7px', background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 10 }}>{file.kind === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}{file.name}<button onClick={async () => setKnowledge(await window.zap.aiDeleteKnowledge(accountId, file.name))} title="Remover arquivo" style={{ display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: colors.danger, cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button></span>)}</div>}
    </section>}
    {activeSection === 'media' && <MediaPanel accountId={accountId} config={config} onSaved={setConfig} colors={colors} />}
    {activeSection === 'test' && <section style={{ maxWidth: 820, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 18, alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><Sparkles size={17} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Laboratório de mensagem</strong><small style={{ color: colors.textMuted }}>Teste o provedor e o modelo antes de ativar o atendimento.</small></div></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="Tipo de geração">{([['text', 'Texto', Bot], ['image', 'Imagem', ImageIcon], ['voice', 'Voz', Mic2]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => { setTestKind(id); setResult(''); setMediaPreview(null) }} style={{ minHeight: 42, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 7, border: `1px solid ${testKind === id ? colors.accent : colors.border}`, background: testKind === id ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}><Icon size={15} /> {label}</button>)}</div>
        {testKind === 'text' && <><label style={{ color: colors.textMuted, fontSize: 12 }}>Provedor principal</label>
        <select value={config.provider} onChange={async e => setConfig(await window.zap.aiSaveConfig(accountId, { provider: e.target.value }))} style={{ width: '100%', padding: 10, margin: '5px 0 12px', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
          <option value="auto">Automático com fallback</option>{config.providers.map((p: any) => <option value={p.id} key={p.id}>{providers[p.id].label} · {p.model}</option>)}
        </select></>}
        {testKind === 'image' && <div style={{ marginBottom: 12 }}><label style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px', border: `1px dashed ${colors.border2}`, borderRadius: 7, cursor: 'pointer', color: colors.text }}><Upload size={15} /> Adicionar fotos de referência<input aria-label="Imagens de referência do teste" hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => loadImageReferences(e.target.files)} /></label><small style={{ display: 'block', color: colors.textMuted, marginTop: 5 }}>Imagem→imagem: as fotos escolhidas aqui substituem as imagens permanentes neste teste, sem mistura oculta.</small>{testImageRefs.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>{testImageRefs.map((item, index) => <span key={`${item.name}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 5, border: `1px solid ${colors.border}`, background: colors.bg }}><img src={item.url} alt="" width={34} height={34} style={{ objectFit: 'cover' }} /><small>{item.name}</small><button title="Remover referência" onClick={() => setTestImageRefs(current => current.filter((_, i) => i !== index))} style={{ border: 0, background: 'transparent', color: colors.danger, cursor: 'pointer' }}><X size={13} /></button></span>)}</div>}</div>}
        <label style={{ display: 'block', color: colors.textMuted, fontSize: 11, marginBottom: 5 }}>{testKind === 'image' ? 'Descrição da imagem' : testKind === 'voice' ? 'Texto para narrar' : 'Pedido para a IA'}</label>
        <textarea aria-label={testKind === 'image' ? 'Descrição da imagem' : testKind === 'voice' ? 'Texto para narrar' : 'Pedido para a IA'} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={testKind === 'image' ? 'Ex.: uma recepcionista sorrindo em uma clínica moderna, foto profissional' : testKind === 'voice' ? 'Ex.: Olá! Seu atendimento está confirmado para amanhã às dez horas.' : 'Ex.: avise o cliente que o orçamento está pronto e pergunte o melhor horário para conversar'} rows={6} style={{ width: '100%', resize: 'vertical', padding: 12, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} />
        <button onClick={generate} disabled={loading || !prompt.trim()} style={{ minHeight: 44, display: 'flex', gap: 7, alignItems: 'center', marginTop: 10, padding: '0 16px', border: 0, borderRadius: 7, background: colors.accent, color: '#07120a', fontWeight: 700, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: loading || !prompt.trim() ? .55 : 1 }}><Sparkles size={17} />{loading ? 'Gerando…' : `Gerar ${testKind === 'image' ? 'imagem' : testKind === 'voice' ? 'áudio' : 'mensagem'}`}</button>
        {result && <div style={{ marginTop: 14, padding: 14, whiteSpace: 'pre-wrap', background: colors.surface2, borderRadius: 7, fontSize: 13, lineHeight: 1.6 }}>{result}</div>}
        {mediaPreview?.kind === 'image' && <figure style={{ margin: '14px 0 0', padding: 10, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bg }}><img src={mediaPreview.url} alt="Prévia gerada pela IA" style={{ display: 'block', width: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 6 }} /><figcaption style={{ color: colors.textMuted, fontSize: 10, marginTop: 7 }}>{mediaPreview.detail}</figcaption></figure>}
        {mediaPreview?.kind === 'voice' && <div style={{ marginTop: 14, padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.bg }}><audio controls src={mediaPreview.url} style={{ width: '100%' }} /><small style={{ display: 'block', color: colors.textMuted, marginTop: 6 }}>{mediaPreview.detail}</small></div>}
        {testKind === 'voice' && <div style={{ marginTop: 15, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}><strong style={{ display: 'block', fontSize: 12 }}>Testar se a IA ouve áudio</strong><label style={{ minHeight: 44, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px', border: `1px dashed ${colors.border2}`, borderRadius: 7, cursor: 'pointer' }}><FileAudio size={15} /> {testAudio?.name || 'Escolher áudio'}<input aria-label="Áudio para transcrever" hidden type="file" accept="audio/*" onChange={e => loadTestAudio(e.target.files?.[0])} /></label><button disabled={!testAudio} onClick={async () => { if (!testAudio) return; setLoading(true); const response = await window.zap.aiTranscribeAudio(accountId, testAudio.base64, testAudio.format); setLoading(false); if (response.success) setResult(response.text); else alert(response.error) }} style={{ minHeight: 44, marginLeft: 8, padding: '0 13px', border: 0, borderRadius: 7, background: testAudio ? colors.accent : colors.border, color: '#07120a', fontWeight: 700, cursor: testAudio ? 'pointer' : 'not-allowed' }}>Transcrever</button></div>}
    </section>}
    {activeSection === 'models' && <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><KeyRound size={17} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Modelos e credenciais</strong><small style={{ color: colors.textMuted }}>Escolha modelos, compare preços e salve cada chave localmente.</small></div></div>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 10 }}>
        {config.providers.map((p: any) => <ProviderCard key={`${accountId}:${p.id}`} accountId={accountId} provider={p} save={saveProvider} colors={colors} />)}
      </section>
    </section>}
  </div>
}

function MediaPanel({ accountId, config, onSaved, colors }: any) {
  const defaults = {
    imageEnabled: false, imageProvider: 'openrouter', imageUseTextKey: true, imageModel: 'openai/gpt-image-1-mini', imageAspectRatio: '1:1', imageResolution: '1K', imageQuality: 'auto', imageDailyLimit: 5, imageUseKnowledgeReferences: true, imageInstructions: '',
    voiceEnabled: false, voiceProvider: 'openrouter', voiceUseTextKey: true, voiceReplyMode: 'request', voiceModel: 'google/gemini-3.1-flash-tts-preview', voiceName: 'Kore', voiceSpeed: 1, voiceOutputFormat: 'auto', voiceDailyLimit: 20,
    transcriptionEnabled: false, transcriptionProvider: 'openrouter', transcriptionUseTextKey: true, transcriptionModel: 'openai/gpt-4o-mini-transcribe', transcriptionLanguage: 'pt', mediaGroupAccess: 'everyone',
  }
  const [draft, setDraft] = useState<any>({ ...defaults, ...config })
  const [imageModels, setImageModels] = useState<any[]>([])
  const [voiceModels, setVoiceModels] = useState<any[]>([])
  const [transcriptionModels, setTranscriptionModels] = useState<any[]>([])
  const [mediaKeys, setMediaKeys] = useState<any>({ image: '', voice: '', transcription: '' })
  const [imageSearch, setImageSearch] = useState('')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [voiceNameSearch, setVoiceNameSearch] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [ptBrOnly, setPtBrOnly] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all')
  const [imageSort, setImageSort] = useState<'cheap' | 'expensive' | 'name'>('cheap')
  const [voiceSort, setVoiceSort] = useState<'cheap' | 'expensive' | 'name'>('cheap')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<any>({ image: 0, voice: 0 })
  useEffect(() => setDraft((current: any) => ({ ...current, ...defaults, ...config })), [accountId, config])
  async function loadModels(next = draft) {
    setLoading(true); setError('')
    try {
      const [images, voices, transcriptions, nextUsage] = await Promise.all([
        window.zap.aiListMediaModels(accountId, 'image', next.imageProvider),
        window.zap.aiListMediaModels(accountId, 'voice', next.voiceProvider),
        window.zap.aiListMediaModels(accountId, 'transcription', next.transcriptionProvider),
        window.zap.aiMediaUsage(accountId),
      ])
      setImageModels(images.success ? images.models : []); setVoiceModels(voices.success ? voices.models : []); setTranscriptionModels(transcriptions.success ? transcriptions.models : []); setUsage(nextUsage || {})
      const failures = [images, voices, transcriptions].filter(item => !item.success).map(item => item.error)
      if (failures.length) setError([...new Set(failures)].join(' · '))
    } catch (reason: any) { setError(reason?.message || 'Não foi possível carregar os modelos.') } finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    void loadModels({ ...defaults, ...config }).finally(() => { if (!active) return })
    return () => { active = false }
  }, [accountId])
  const selectedVoiceModel = voiceModels.find(model => model.id === draft.voiceModel)
  const selectedImageModel = imageModels.find(model => model.id === draft.imageModel)
  const voices = (selectedVoiceModel?.voices || []).filter((voice: any) => `${voice.id} ${voice.locale}`.toLowerCase().includes(voiceNameSearch.toLowerCase()) && (genderFilter === 'all' || voice.gender === genderFilter))
  const imageOptions = imageModels.filter(model => {
    const matchesSearch = `${model.name} ${model.id}`.toLowerCase().includes(imageSearch.toLowerCase())
    return matchesSearch && (priceFilter === 'all' || (priceFilter === 'free' ? model.isFree : !model.isFree))
  }).sort((a,b) => imageSort === 'name' ? a.name.localeCompare(b.name) : imageSort === 'expensive' ? (b.minImagePrice || 0) - (a.minImagePrice || 0) : (a.minImagePrice || 0) - (b.minImagePrice || 0))
  const voiceOptions = voiceModels.filter(model => `${model.name} ${model.id}`.toLowerCase().includes(voiceSearch.toLowerCase()) && (!ptBrOnly || model.ptBrSupported)).sort((a,b) => voiceSort === 'name' ? a.name.localeCompare(b.name) : voiceSort === 'expensive' ? (b.promptPrice || 0) - (a.promptPrice || 0) : (a.promptPrice || 0) - (b.promptPrice || 0))
  const field = (key: string, value: any) => setDraft((current: any) => ({ ...current, [key]: value }))
  function changeMediaProvider(kind: 'image' | 'voice' | 'transcription', provider: string) {
    const model = provider === 'openai' ? (kind === 'image' ? 'gpt-image-2' : kind === 'voice' ? 'gpt-4o-mini-tts' : 'gpt-4o-mini-transcribe') : (kind === 'image' ? 'openai/gpt-image-1-mini' : kind === 'voice' ? 'google/gemini-3.1-flash-tts-preview' : 'openai/gpt-4o-mini-transcribe')
    setDraft((current: any) => { const next = { ...current, [`${kind}Provider`]: provider, [`${kind}Model`]: model }; void loadModels(next); return next })
  }
  function selectVoiceModel(modelId: string) {
    const model = voiceModels.find(item => item.id === modelId)
    setDraft((current: any) => ({ ...current, voiceModel: modelId, voiceName: model?.supportedVoices?.[0] || current.voiceName, voiceOutputFormat: 'auto' }))
  }
  async function save() {
    try {
      setSaveState('saving'); setError('')
      let saved = await window.zap.aiSaveConfig(accountId, {
        imageEnabled: draft.imageEnabled, imageModel: draft.imageModel, imageAspectRatio: draft.imageAspectRatio, imageResolution: draft.imageResolution, imageQuality: draft.imageQuality, imageDailyLimit: Number(draft.imageDailyLimit),
        imageProvider: draft.imageProvider, imageUseTextKey: draft.imageUseTextKey, imageUseKnowledgeReferences: draft.imageUseKnowledgeReferences, imageInstructions: draft.imageInstructions,
        voiceEnabled: draft.voiceEnabled, voiceProvider: draft.voiceProvider, voiceUseTextKey: draft.voiceUseTextKey, voiceReplyMode: draft.voiceReplyMode, voiceModel: draft.voiceModel, voiceName: draft.voiceName.trim(), voiceSpeed: Number(draft.voiceSpeed), voiceOutputFormat: draft.voiceOutputFormat, voiceDailyLimit: Number(draft.voiceDailyLimit),
        transcriptionEnabled: draft.transcriptionEnabled, transcriptionProvider: draft.transcriptionProvider, transcriptionUseTextKey: draft.transcriptionUseTextKey, transcriptionModel: draft.transcriptionModel, transcriptionLanguage: draft.transcriptionLanguage, mediaGroupAccess: draft.mediaGroupAccess,
      })
      for (const kind of ['image','voice','transcription']) if (!draft[`${kind}UseTextKey`] && mediaKeys[kind]) saved = await window.zap.aiSaveConfig(accountId, { mediaKeyKind: kind, mediaKey: mediaKeys[kind] })
      setMediaKeys({ image: '', voice: '', transcription: '' }); setDraft({ ...defaults, ...saved }); onSaved(saved); void loadModels(saved); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2200)
    } catch (reason: any) { setSaveState('error'); setError(reason?.message || 'Não foi possível salvar.') }
  }
  const switchButton = (checked: boolean, label: string, toggle: () => void) => <button role="switch" aria-checked={checked} aria-label={label} onClick={toggle} style={{ width: 48, height: 28, border: 0, borderRadius: 20, padding: 4, background: checked ? colors.accent : colors.border, cursor: 'pointer', display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start' }}><span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} /></button>
  const selectStyle = { width: '100%', minHeight: 44, padding: '0 10px', background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6 }
  const inputStyle = { ...selectStyle, padding: '10px' }
  const providerFields = (kind: 'image' | 'voice' | 'transcription', label: string) => <div style={{ marginTop: 11, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 7, background: colors.bg }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 7 }}><label style={{ color: colors.textMuted, fontSize: 10 }}>Provedor de {label}<select aria-label={`Provedor de ${label}`} value={draft[`${kind}Provider`]} onChange={e => changeMediaProvider(kind, e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value="openrouter">OpenRouter</option><option value="openai">OpenAI direto</option></select></label><label style={{ display: 'flex', alignItems: 'center', gap: 7, color: colors.text, fontSize: 10, paddingTop: 17 }}><input type="checkbox" checked={draft[`${kind}UseTextKey`]} onChange={e => field(`${kind}UseTextKey`, e.target.checked)} /> Reutilizar chave de texto deste provedor</label></div>{!draft[`${kind}UseTextKey`] && <label style={{ display: 'block', marginTop: 7, color: colors.textMuted, fontSize: 10 }}>Chave exclusiva de {label}<input aria-label={`Chave exclusiva de ${label}`} type="password" value={mediaKeys[kind]} onChange={e => setMediaKeys((current: any) => ({ ...current, [kind]: e.target.value }))} placeholder={draft[`${kind}HasDedicatedKey`] ? 'Chave já salva · cole outra para substituir' : 'Cole a chave API'} autoComplete="off" style={{ ...inputStyle, marginTop: 5 }} /></label>}</div>
  const money = (value: number) => value ? `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })}` : '$0'
  return <section style={{ display: 'grid', gap: 12 }}>
    <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${colors.border2}`, background: `linear-gradient(120deg,${colors.successBg},${colors.surface})` }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Sparkles size={18} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Foto, voz e audição</strong><small style={{ color: colors.textMuted }}>Provedor e chave independentes por função, isolados nesta conta.</small></div><button onClick={() => void loadModels()} disabled={loading} style={{ marginLeft: 'auto', minHeight: 38, padding: '0 11px', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, cursor: loading ? 'wait' : 'pointer' }}><RefreshCw size={14} /> {loading ? 'Carregando…' : 'Atualizar modelos'}</button></div>
      {error && <div role="alert" style={{ marginTop: 9, color: colors.danger, fontSize: 11 }}>{error}</div>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>
      <article style={{ padding: 15, border: `1px solid ${draft.imageEnabled ? colors.border2 : colors.border}`, borderRadius: 10, background: colors.surface }}>
        <header style={{ display: 'flex', gap: 9, alignItems: 'center' }}><ImageIcon size={18} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Gerar e enviar fotos</strong><small style={{ color: colors.textMuted }}>Comandos: /foto e /imagem</small></div><span style={{ marginLeft: 'auto' }}>{switchButton(Boolean(draft.imageEnabled), 'Gerar imagens', () => field('imageEnabled', !draft.imageEnabled))}</span></header>
        {providerFields('image', 'imagem')}
        <label style={{ display: 'block', marginTop: 13, color: colors.textMuted, fontSize: 10 }}>Pesquisar modelo<input aria-label="Pesquisar modelo de imagem" value={imageSearch} onChange={e => setImageSearch(e.target.value)} placeholder="Nome ou ID do modelo" style={{ ...inputStyle, marginTop: 5 }} /></label>
        <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>{([['all', 'Todos'], ['free', 'Grátis'], ['paid', 'Pagos']] as const).map(([id, label]) => <button key={id} onClick={() => setPriceFilter(id)} style={{ minHeight: 36, padding: '0 10px', border: `1px solid ${priceFilter === id ? colors.accent : colors.border}`, background: priceFilter === id ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer', borderRadius: 6, fontSize: 10 }}>{label}</button>)}<select aria-label="Ordenar modelos de imagem" value={imageSort} onChange={e => setImageSort(e.target.value as any)} style={{ ...selectStyle, minHeight: 36, width: 150, marginLeft: 'auto' }}><option value="cheap">Mais baratos</option><option value="expensive">Mais caros</option><option value="name">Nome A–Z</option></select></div>
        <label style={{ display: 'block', marginTop: 9, color: colors.textMuted, fontSize: 10 }}>Modelo de imagem<select aria-label="Modelo de imagem" value={draft.imageModel} onChange={e => field('imageModel', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value={draft.imageModel}>{draft.imageModel}</option>{imageOptions.filter(m => m.id !== draft.imageModel).map(model => <option key={model.id} value={model.id}>[{model.isFree ? 'GRÁTIS' : 'PAGO'}] {model.name}</option>)}</select></label>
        {selectedImageModel && <div style={{ marginTop: 7, padding: 8, border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 10 }}><strong style={{ color: colors.success }}>Imagem→imagem confirmada</strong> · até {selectedImageModel.maxReferences || 16} referências{selectedImageModel.pricingLines?.length ? <div style={{ marginTop: 4 }}>{selectedImageModel.pricingLines.slice(0,6).map((line: any, i: number) => <span key={i} style={{ display: 'block' }}>{line.billable}: {money(line.costUsd)} / {line.unit}{line.variant ? ` · ${line.variant}` : ''}</span>)}</div> : <div>Preço: consulte a tabela oficial do provedor para tamanho/qualidade escolhidos.</div>}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginTop: 9 }}>
          <label style={{ color: colors.textMuted, fontSize: 10 }}>Formato<select aria-label="Formato da imagem" value={draft.imageAspectRatio} onChange={e => field('imageAspectRatio', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}>{['1:1', '16:9', '9:16', '4:3', '3:4'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label style={{ color: colors.textMuted, fontSize: 10 }}>Resolução<select aria-label="Resolução da imagem" value={draft.imageResolution} onChange={e => field('imageResolution', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}>{['512', '1K', '2K', '4K'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label style={{ color: colors.textMuted, fontSize: 10 }}>Qualidade<select aria-label="Qualidade da imagem" value={draft.imageQuality} onChange={e => field('imageQuality', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}>{['auto', 'low', 'medium', 'high'].map(v => <option key={v}>{v}</option>)}</select></label>
        </div>
        <label style={{ display: 'block', marginTop: 9, color: colors.textMuted, fontSize: 10 }}>Limite diário<input aria-label="Limite diário de imagens" type="number" min={1} max={100} value={draft.imageDailyLimit} onChange={e => field('imageDailyLimit', e.target.value)} style={{ ...inputStyle, marginTop: 5 }} /></label>
        <label style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 9, color: colors.text, fontSize: 10 }}><input type="checkbox" checked={draft.imageUseKnowledgeReferences} onChange={e => field('imageUseKnowledgeReferences', e.target.checked)} /> Usar automaticamente as fotos salvas em Contexto</label>
        <label style={{ display: 'block', marginTop: 9, color: colors.textMuted, fontSize: 10 }}>Instruções visuais permanentes<textarea aria-label="Instruções visuais permanentes" rows={3} value={draft.imageInstructions} onChange={e => field('imageInstructions', e.target.value)} placeholder="Ex.: preserve rosto, cabelo, tom de pele e identidade visual das fotos de referência." style={{ ...inputStyle, marginTop: 5, resize: 'vertical' }} /></label>
        <small style={{ display: 'block', marginTop: 6, color: colors.textMuted }}>Hoje: {usage.image || 0}/{draft.imageDailyLimit} gerações. O modelo pode ignorar opções incompatíveis.</small>
      </article>
      <article style={{ padding: 15, border: `1px solid ${draft.voiceEnabled ? colors.border2 : colors.border}`, borderRadius: 10, background: colors.surface }}>
        <header style={{ display: 'flex', gap: 9, alignItems: 'center' }}><Mic2 size={18} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Gerar e enviar voz</strong><small style={{ color: colors.textMuted }}>Áudio PTT: /audio e /voz</small></div><span style={{ marginLeft: 'auto' }}>{switchButton(Boolean(draft.voiceEnabled), 'Gerar voz', () => field('voiceEnabled', !draft.voiceEnabled))}</span></header>
        {providerFields('voice', 'voz')}
        <label style={{ display: 'block', marginTop: 13, color: colors.textMuted, fontSize: 10 }}>Quando responder por voz<select aria-label="Quando responder por voz" value={draft.voiceReplyMode} onChange={e => field('voiceReplyMode', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value="request">Somente quando pedirem áudio</option><option value="always">Sempre responder em áudio</option></select></label>
        <label style={{ display: 'block', marginTop: 9, color: colors.textMuted, fontSize: 10 }}>Pesquisar modelo<input aria-label="Pesquisar modelo de voz" value={voiceSearch} onChange={e => setVoiceSearch(e.target.value)} placeholder="Nome ou ID do modelo" style={{ ...inputStyle, marginTop: 5 }} /></label><div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 7 }}><label style={{ color: colors.text, fontSize: 10 }}><input type="checkbox" checked={ptBrOnly} onChange={e => setPtBrOnly(e.target.checked)} /> Somente pt-BR confirmado</label><select aria-label="Ordenar modelos de voz" value={voiceSort} onChange={e => setVoiceSort(e.target.value as any)} style={{ ...selectStyle, minHeight: 36, width: 150, marginLeft: 'auto' }}><option value="cheap">Mais baratos</option><option value="expensive">Mais caros</option><option value="name">Nome A–Z</option></select></div>
        <label style={{ display: 'block', marginTop: 9, color: colors.textMuted, fontSize: 10 }}>Modelo TTS<select aria-label="Modelo de voz" value={draft.voiceModel} onChange={e => selectVoiceModel(e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value={draft.voiceModel}>{draft.voiceModel}</option>{voiceOptions.filter(m => m.id !== draft.voiceModel).map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        {selectedVoiceModel && <div style={{ marginTop: 7, padding: 8, border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 10 }}><strong style={{ color: colors.text }}>Preço informado pelo catálogo</strong><br />Entrada: {money(selectedVoiceModel.inputPricePerMillion)} / 1M · saída: {money(selectedVoiceModel.outputPricePerMillion)} / 1M<br />Saída/parâmetros: {(selectedVoiceModel.supportedParameters || []).join(', ') || 'dependem do provedor'}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 9 }}>
          <label style={{ color: colors.textMuted, fontSize: 10 }}>Pesquisar voz<input aria-label="Pesquisar voz" value={voiceNameSearch} onChange={e => setVoiceNameSearch(e.target.value)} style={{ ...inputStyle, marginTop: 5 }} /></label>
          <label style={{ color: colors.textMuted, fontSize: 10 }}>Nome da voz<input aria-label="Nome personalizado da voz" value={draft.voiceName} onChange={e => field('voiceName', e.target.value)} placeholder="Ex.: Kore" style={{ ...inputStyle, marginTop: 5 }} /></label>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>{([['all','Todas'],['female','Femininas'],['male','Masculinas']] as const).map(([id,label]) => <button key={id} onClick={() => setGenderFilter(id)} style={{ minHeight: 34, padding: '0 9px', border: `1px solid ${genderFilter === id ? colors.accent : colors.border}`, background: genderFilter === id ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer' }}>{label}</button>)}</div>
        <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 7, border: `1px solid ${colors.border}` }}>{voices.length ? voices.map((voice: any) => <button key={voice.id} onClick={() => field('voiceName', voice.id)} style={{ width: '100%', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 9px', border: 0, borderBottom: `1px solid ${colors.border}`, background: draft.voiceName === voice.id ? colors.successBg : colors.bg, color: colors.text, cursor: 'pointer', textAlign: 'left' }}><span>{voice.id}</span><small style={{ color: colors.textMuted }}>{voice.gender === 'female' ? 'feminina' : voice.gender === 'male' ? 'masculina' : 'gênero não informado'} · {voice.locale}</small></button>) : <small style={{ display: 'block', padding: 9, color: colors.textMuted }}>Este modelo não publicou uma lista de vozes.</small>}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8, marginTop: 9 }}><label style={{ color: colors.textMuted, fontSize: 10 }}>Velocidade: {Number(draft.voiceSpeed).toFixed(1)}x<input aria-label="Velocidade da voz" type="range" min="0.5" max="2" step="0.1" value={draft.voiceSpeed} onChange={e => field('voiceSpeed', e.target.value)} style={{ width: '100%', minHeight: 36, accentColor: colors.accent }} /></label><label style={{ color: colors.textMuted, fontSize: 10 }}>Formato de saída<select aria-label="Formato de saída da voz" value={draft.voiceOutputFormat} onChange={e => field('voiceOutputFormat', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value="auto">Automático</option><option value="mp3">MP3</option><option value="pcm">PCM</option></select></label></div>
        <label style={{ display: 'block', marginTop: 4, color: colors.textMuted, fontSize: 10 }}>Limite diário<input aria-label="Limite diário de áudios" type="number" min={1} max={200} value={draft.voiceDailyLimit} onChange={e => field('voiceDailyLimit', e.target.value)} style={{ ...inputStyle, marginTop: 5 }} /></label>
        <small style={{ display: 'block', marginTop: 6, color: colors.textMuted }}>Hoje: {usage.voice || 0}/{draft.voiceDailyLimit} gerações. Automático usa PCM no Gemini e MP3 nos demais; o app converte tudo para OGG/Opus ao enviar no WhatsApp.</small>
      </article>
    </div>
    <article style={{ padding: 15, border: `1px solid ${draft.transcriptionEnabled ? colors.border2 : colors.border}`, borderRadius: 10, background: colors.surface }}><header style={{ display: 'flex', alignItems: 'center', gap: 9 }}><FileAudio size={18} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 13 }}>Ouvir áudios recebidos (STT)</strong><small style={{ color: colors.textMuted }}>Transcreve voz do WhatsApp e entrega o texto ao assistente.</small></div><span style={{ marginLeft: 'auto' }}>{switchButton(Boolean(draft.transcriptionEnabled), 'Ouvir áudios', () => field('transcriptionEnabled', !draft.transcriptionEnabled))}</span></header>{providerFields('transcription', 'transcrição')}<div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 8, marginTop: 9 }}><label style={{ color: colors.textMuted, fontSize: 10 }}>Modelo compatível<select aria-label="Modelo de transcrição" value={draft.transcriptionModel} onChange={e => field('transcriptionModel', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value={draft.transcriptionModel}>{draft.transcriptionModel}</option>{transcriptionModels.filter(model => model.id !== draft.transcriptionModel).map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label><label style={{ color: colors.textMuted, fontSize: 10 }}>Idioma preferido<select aria-label="Idioma de transcrição" value={draft.transcriptionLanguage} onChange={e => field('transcriptionLanguage', e.target.value)} style={{ ...selectStyle, marginTop: 5 }}><option value="pt">Português</option><option value="">Detectar automaticamente</option><option value="en">Inglês</option><option value="es">Espanhol</option></select></label></div></article>
    <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface }}><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Users size={17} color={colors.accent} /><div><strong style={{ display: 'block', fontSize: 12 }}>Imagem e voz em grupos</strong><small style={{ color: colors.textMuted }}>A IA continua respondendo todos no grupo; escolha quem pode consumir geração multimídia.</small></div><select aria-label="Permissão de mídia em grupos" value={draft.mediaGroupAccess} onChange={e => field('mediaGroupAccess', e.target.value)} style={{ ...selectStyle, width: 250, marginLeft: 'auto' }}><option value="everyone">Todos os participantes</option><option value="authorized">Somente ADMIN/autorizados</option></select></div></div>
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><button onClick={() => void save()} disabled={saveState === 'saving'} style={{ minHeight: 44, padding: '0 16px', border: 0, borderRadius: 7, background: colors.accent, color: '#07120a', fontWeight: 800, cursor: saveState === 'saving' ? 'wait' : 'pointer' }}>{saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Configuração salva' : 'Salvar foto, voz e audição'}</button><small style={{ color: saveState === 'error' ? colors.danger : saveState === 'saved' ? colors.success : colors.textMuted }}>Chaves exclusivas são criptografadas localmente e nunca aparecem novamente na tela.</small></div>
  </section>
}

function ApiGuideModal({ colors, close }: { colors: any; close: () => void }) {
  const [active, setActive] = useState('openrouter')
  const meta = providers[active]
  const steps = [
    ['Abra o provedor', `Clique em “Criar chave no ${meta.label}” e entre na sua conta.`],
    ['Gere uma API key', 'Crie uma nova chave, dê um nome como “Zap Mágico” e copie o valor exibido.'],
    ['Cole e salve', `Volte ao cartão ${meta.label}, cole a chave no campo API key e clique em Salvar.`],
    ['Carregue os modelos', 'Clique no botão de atualizar ao lado do seletor e escolha o modelo desejado.'],
    ['Faça um teste', 'No painel Assistente IA, escreva um pedido curto e clique em Gerar mensagem.'],
  ]
  return createPortal(<div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', background: 'rgba(5,8,12,.68)', backdropFilter: 'blur(5px)', padding: 'clamp(12px, 3vw, 24px)' }}>
    <div style={{ width: 'min(760px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: colors.surface, color: colors.text, border: `1px solid ${colors.border2}`, borderRadius: 8, boxShadow: '0 28px 80px rgba(0,0,0,.3)' }}>
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '18px 20px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 7, background: colors.accent, color: '#07120a' }}><KeyRound size={20} /></div>
        <div><h2 style={{ fontSize: 17, margin: 0 }}>Configurar IA no Zap Mágico</h2><p style={{ color: colors.textMuted, fontSize: 11, margin: '3px 0 0' }}>Passo a passo para conectar seu provedor com segurança.</p></div>
        <button onClick={close} title="Fechar" style={{ marginLeft: 'auto', width: 34, height: 34, display: 'grid', placeItems: 'center', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, cursor: 'pointer' }}><X size={17} /></button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 190px) minmax(0, 1fr)', minHeight: 0, overflow: 'auto', flex: 1 }}>
        <aside style={{ padding: 14, borderRight: `1px solid ${colors.border}`, background: colors.bg }}>
          <small style={{ color: colors.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1.2 }}>ESCOLHA O PROVEDOR</small>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>{Object.entries(providers).map(([id, p]) => <button key={id} onClick={() => setActive(id)} style={{ textAlign: 'left', padding: '10px 11px', border: `1px solid ${active === id ? colors.border2 : 'transparent'}`, background: active === id ? colors.surface2 : 'transparent', color: active === id ? colors.text : colors.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: active === id ? 700 : 500 }}>{p.label}</button>)}</div>
          <div style={{ marginTop: 18, padding: 11, borderRadius: 7, background: colors.successBg, color: colors.success, fontSize: 10, lineHeight: 1.45 }}><ShieldCheck size={15} style={{ marginBottom: 5 }} /><br />Sua chave fica criptografada neste computador e não aparece na interface.</div>
        </aside>
        <main style={{ minWidth: 0, padding: '19px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><h3 style={{ fontSize: 15, margin: 0 }}>{meta.label}</h3><button onClick={() => window.zap.openExternal(meta.keyUrl)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, border: 0, background: colors.accent, color: '#07120a', padding: '8px 11px', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Criar chave no {meta.label} <ExternalLink size={13} /></button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{steps.map(([title, text], index) => <div key={title} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}><span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: '50%', background: index === 0 ? colors.accent : colors.surface2, color: index === 0 ? '#07120a' : colors.textMuted, fontSize: 11, fontWeight: 800 }}>{index + 1}</span><div><strong style={{ display: 'block', fontSize: 12 }}>{title}</strong><p style={{ color: colors.textMuted, fontSize: 11, lineHeight: 1.45, margin: '3px 0 0' }}>{text}</p></div></div>)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}><button onClick={() => window.zap.openExternal(meta.docsUrl)} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: colors.accent2, cursor: 'pointer', fontSize: 11 }}>Ver documentação oficial <ExternalLink size={12} /></button><button onClick={close} style={{ marginLeft: 'auto', border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>Entendi, continuar</button></div>
        </main>
      </div>
    </div>
  </div>, document.body)
}

function ProviderCard({ accountId, provider, save, colors }: any) {
  const meta = providers[provider.id]
  const [key, setKey] = useState('')
  const [model, setModel] = useState(provider.model)
  const [models, setModels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  async function loadModels() {
    setLoading(true)
    const response = await window.zap.aiListModels(accountId, provider.id)
    setLoading(false)
    if (response.success) setModels(response.models); else alert(response.error)
  }
  useEffect(() => { if (provider.id === 'openrouter') void loadModels() }, [accountId, provider.id])
  const filteredModels = models.filter(item => {
    const matchesSearch = `${item.name || ''} ${item.id || ''}`.toLowerCase().includes(modelSearch.trim().toLowerCase())
    const matchesPrice = priceFilter === 'all' || (priceFilter === 'free' ? item.isFree : !item.isFree)
    return matchesSearch && matchesPrice
  })
  const selectedModel = models.find(item => item.id === model)
  const pricePerMillion = (value: number) => value > 0 ? `$${(value * 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}/M` : 'Grátis'
  return <div style={{ background: colors.surface, border: `1px solid ${provider.configured ? colors.border2 : colors.border}`, borderRadius: 8, padding: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><KeyRound size={15} color={colors.accent} /><strong style={{ fontSize: 13 }}>{meta.label}</strong>{provider.configured && <><CheckCircle2 size={14} color={colors.success} style={{ marginLeft: 'auto' }} /><small style={{ color: colors.success }}>Configurado</small></>}</div>
    <p style={{ color: colors.textMuted, fontSize: 11, lineHeight: 1.45, margin: '7px 0' }}>{meta.help}</p>
    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
      <button onClick={() => window.zap.openExternal(meta.keyUrl)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 0, background: 'transparent', color: colors.accent2, cursor: 'pointer', padding: 0, fontSize: 11 }}>Obter chave <ExternalLink size={12} /></button>
      <button onClick={() => window.zap.openExternal(meta.docsUrl)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 0, background: 'transparent', color: colors.textMuted, cursor: 'pointer', padding: 0, fontSize: 11 }}>Documentação <ExternalLink size={12} /></button>
    </div>
    {provider.id === 'openrouter' && <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 7, marginBottom: 7 }}>
      <input aria-label="Pesquisar modelos OpenRouter" value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Pesquisar por nome ou ID…" style={{ minWidth: 0, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} />
      <div style={{ display: 'flex', gap: 4 }} aria-label="Filtrar modelos por preço">{([['all', 'Todos'], ['free', 'Grátis'], ['paid', 'Pagos']] as const).map(([value, label]) => <button key={value} onClick={() => setPriceFilter(value)} style={{ border: `1px solid ${priceFilter === value ? colors.accent : colors.border}`, background: priceFilter === value ? colors.successBg : colors.surface2, color: priceFilter === value ? colors.accent : colors.textMuted, padding: '0 8px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>{label}</button>)}</div>
    </div>}
    <div style={{ display: 'flex', gap: 6 }}>
      <select value={model} onChange={e => setModel(e.target.value)} style={{ minWidth: 0, flex: 1, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
        <option value={model}>{models.length ? `Atual: ${model}` : model}</option>{filteredModels.filter(m => m.id !== model).map(m => <option value={m.id} key={m.id}>{provider.id === 'openrouter' ? `[${m.isFree ? 'GRÁTIS' : 'PAGO'}] ` : ''}{m.name}{m.name !== m.id ? ` · ${m.id}` : ''}</option>)}
      </select>
      <button onClick={loadModels} disabled={loading} title="Atualizar modelos" style={{ width: 36, display: 'grid', placeItems: 'center', border: `1px solid ${colors.border}`, background: colors.surface2, color: colors.text, cursor: 'pointer' }}><RefreshCw size={15} className={loading ? 'loader' : ''} /></button>
    </div>
    <small style={{ display: 'block', color: colors.textDim, marginTop: 4 }}>{models.length ? `${filteredModels.length} de ${models.length} modelos` : loading ? 'Carregando modelos atuais…' : 'Clique em atualizar para carregar os modelos atuais'}</small>
    {provider.id === 'openrouter' && selectedModel && <div style={{ marginTop: 7, padding: 8, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 10, lineHeight: 1.45 }}><strong style={{ color: selectedModel.isFree ? colors.success : colors.text }}>{selectedModel.isFree ? 'Modelo gratuito' : 'Modelo pago'}</strong>{selectedModel.contextLength > 0 && <> · contexto {Math.round(selectedModel.contextLength / 1000)}K</>}<br />Entrada: {pricePerMillion(selectedModel.promptPrice)} · saída: {pricePerMillion(selectedModel.completionPrice)}</div>}
    <div style={{ display: 'flex', gap: 6, marginTop: 7 }}><input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder={provider.configured ? 'Chave já configurada' : 'Cole a API key'} style={{ minWidth: 0, flex: 1, padding: 8, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }} /><button onClick={() => save(provider.id, key, model)} style={{ border: 0, padding: '0 11px', background: colors.accent, color: '#07120a', fontWeight: 700, cursor: 'pointer' }}>Salvar</button></div>
  </div>
}

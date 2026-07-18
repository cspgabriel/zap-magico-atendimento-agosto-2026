import React, { useEffect, useState } from 'react'
import { Bot, Pause, Play, Plus, Trash2, Workflow } from 'lucide-react'
import { useTheme } from '../theme'

const blank = { name: '', account_id: '*', keyword: '', reply: '', add_tag: '', set_status: '', set_priority: '', enabled: true }

export default function Automations({ accountId, accounts }: { accountId: string; accounts: any[] }) {
  const { colors } = useTheme()
  const [rules, setRules] = useState<any[]>([])
  const [form, setForm] = useState<any>({ ...blank, account_id: accountId })
  const [editing, setEditing] = useState(false)
  const load = () => window.zap.getAutomations().then(setRules)
  useEffect(() => { void load() }, [])

  async function save() {
    if (!form.name.trim()) return alert('Dê um nome para a automação.')
    if (!form.keyword.trim()) return alert('Informe a palavra-chave do gatilho.')
    if (!form.reply.trim() && !form.add_tag.trim() && !form.set_status && !form.set_priority) return alert('Configure pelo menos uma ação.')
    await window.zap.saveAutomation(form); setForm({ ...blank, account_id: accountId }); setEditing(false); await load()
  }

  return <div className="page-stack">
    <header className="page-header"><div><span className="eyebrow">ATENDIMENTO AUTOMATIZADO</span><h2>Automações</h2><p>Reaja a mensagens, organize conversas e responda sem perder o controle humano.</p></div><button className="primary-button" onClick={() => { setForm({ ...blank, account_id: accountId }); setEditing(true) }}><Plus size={16}/> Nova automação</button></header>

    <div className="metric-grid compact">
      <div className="metric-card"><Workflow/><strong>{rules.length}</strong><span>regras criadas</span></div>
      <div className="metric-card"><Play/><strong>{rules.filter(r => r.enabled).length}</strong><span>ativas</span></div>
      <div className="metric-card"><Bot/><strong>{rules.reduce((sum, r) => sum + Number(r.executions || 0), 0)}</strong><span>execuções</span></div>
    </div>

    {editing && <section className="panel automation-editor" style={{ background: colors.surface, borderColor: colors.border }}>
      <div className="section-title"><h3>{form.id ? 'Editar automação' : 'Nova automação'}</h3><span>Quando a mensagem contiver a palavra-chave, execute as ações abaixo.</span></div>
      <div className="form-grid">
        <label>Nome<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Triagem comercial" /></label>
        <label>Conta<select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}><option value="*">Todas as contas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Mensagem contém<input value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} placeholder="Ex.: preço" /></label>
        <label>Adicionar etiqueta<input value={form.add_tag} onChange={e => setForm({ ...form, add_tag: e.target.value })} placeholder="Ex.: lead quente" /></label>
        <label>Status<select value={form.set_status} onChange={e => setForm({ ...form, set_status: e.target.value })}><option value="">Não alterar</option><option value="open">Aberta</option><option value="pending">Pendente</option><option value="resolved">Resolvida</option></select></label>
        <label>Prioridade<select value={form.set_priority} onChange={e => setForm({ ...form, set_priority: e.target.value })}><option value="">Não alterar</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
        <label className="span-2">Resposta automática<textarea rows={4} value={form.reply} onChange={e => setForm({ ...form, reply: e.target.value })} placeholder="Olá! Recebi sua mensagem. Um atendente continuará por aqui." /></label>
      </div>
      <div className="editor-actions"><button className="ghost-button" onClick={() => setEditing(false)}>Cancelar</button><button className="primary-button" onClick={save}>Salvar e ativar</button></div>
    </section>}

    <section className="panel" style={{ background: colors.surface, borderColor: colors.border }}>
      <div className="automation-list">{rules.length === 0 ? <div className="empty-state"><Workflow size={30}/><strong>Nenhuma automação criada</strong><span>Comece com triagem, horário comercial ou palavras-chave.</span></div> : rules.map(rule => <article key={rule.id} className={`automation-row ${rule.enabled ? '' : 'muted'}`}>
        <div className="automation-icon"><Workflow size={18}/></div><div className="automation-copy"><strong>{rule.name}</strong><span>Se contiver “{rule.keyword}” · {rule.account_id === '*' ? 'todas as contas' : accounts.find(a => a.id === rule.account_id)?.name || 'conta'}</span><small>{rule.reply ? 'Responder' : ''}{rule.add_tag ? ` · etiquetar “${rule.add_tag}”` : ''}{rule.set_status ? ` · status ${rule.set_status}` : ''} · {rule.executions || 0} execuções</small></div>
        <button className="icon-button" title={rule.enabled ? 'Pausar' : 'Ativar'} onClick={async () => { await window.zap.saveAutomation({ ...rule, enabled: !rule.enabled }); await load() }}>{rule.enabled ? <Pause size={16}/> : <Play size={16}/>}</button>
        <button className="ghost-button" onClick={() => { setForm({ ...rule, enabled: Boolean(rule.enabled) }); setEditing(true) }}>Editar</button>
        <button className="icon-button danger" title="Excluir" onClick={async () => { if (confirm('Excluir esta automação?')) { await window.zap.deleteAutomation(rule.id); await load() } }}><Trash2 size={16}/></button>
      </article>)}</div>
    </section>
  </div>
}

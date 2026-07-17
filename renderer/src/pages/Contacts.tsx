import React, { useEffect, useState } from 'react'
import { useTheme } from '../theme'

export default function Contacts() {
  const [contacts, setContacts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [groupName, setGroupName] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const { colors } = useTheme()

  useEffect(() => { load() }, [])

  function load() { window.zap.getContacts().then(setContacts) }
  const visibleContacts = contacts.filter(c => `${c.name} ${c.phone} ${c.group_name}`.toLowerCase().includes(query.toLowerCase()))

  async function handleAdd() {
    if (!name || !phone) return
    await window.zap.addContact({ name, phone, group_name: groupName, notes })
    setName(''); setPhone(''); setGroupName(''); setNotes('')
    load()
  }

  async function handleImport() {
    const result = await window.zap.importCSV()
    if (result.success) {
      alert(`${result.count} contatos importados!`)
      load()
    } else {
      alert(result.error || 'Erro ao importar')
    }
  }

  async function handleClear() {
    if (confirm('Remover todos os contatos?')) {
      await window.zap.clearContacts()
      load()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Clientes ({contacts.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleImport} style={{
            padding: '8px 16px', background: colors.accent2, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>Importar CSV</button>
          <button onClick={handleClear} style={{
            padding: '8px 16px', background: colors.errorBg, color: colors.danger, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>Limpar Tudo</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, padding: 14, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
        <input placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, color: colors.text }} />
        <input placeholder="Telefone (com DDD)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          style={{ flex: 1, padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, color: colors.text }} />
        <input placeholder="Grupo/etiqueta" value={groupName} onChange={(e) => setGroupName(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, color: colors.text }} />
        <button onClick={handleAdd} style={{
          padding: '8px 16px', background: colors.accent, color: '#0f1a14', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
        }}>Adicionar</button>
      </div>
      <input placeholder="Notas internas de atendimento (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, color: colors.text, marginBottom: 16 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}><strong style={{ fontSize: 13 }}>Base de clientes</strong><span style={{ color: colors.textDim, fontSize: 11 }}>{contacts.length} registros</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente" style={{ marginLeft: 'auto', width: 220, padding: '8px 10px', border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text }} /></div>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted, fontWeight: 600 }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted, fontWeight: 600 }}>Telefone</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted, fontWeight: 600 }}>Grupo</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted, fontWeight: 600 }}>Notas</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', color: colors.textMuted, fontWeight: 600 }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {visibleContacts.map((c) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 16px' }}>{c.name}</td>
                <td style={{ padding: '10px 16px', color: colors.textMuted }}>{c.phone}</td>
                <td style={{ padding: '10px 16px', color: colors.accent }}>{c.group_name || '-'}</td>
                <td style={{ padding: '10px 16px', color: colors.textMuted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '-'}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button onClick={() => { if (confirm('Remover?')) { window.zap.deleteContact(c.id).then(load) } }}
                    style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 13 }}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {visibleContacts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: colors.textDim }}>Nenhum contato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

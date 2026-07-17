import React, { useEffect, useState } from 'react'
import { useTheme } from '../theme'

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const { colors } = useTheme()

  useEffect(() => { load() }, [])

  function load() { window.zap.getTemplates().then(setTemplates) }

  async function handleSave() {
    if (!name || !message) return
    await window.zap.saveTemplate(editingId ? { id: editingId, name, message } : { name, message })
    setName(''); setMessage(''); setEditingId(null)
    load()
  }

  function handleEdit(t: any) {
    setName(t.name); setMessage(t.message); setEditingId(t.id)
  }

  function handleCancel() {
    setName(''); setMessage(''); setEditingId(null)
  }

  const vars = ['{nome}', '{telefone}']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Respostas prontas</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: colors.surface, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {editingId ? 'Editar resposta' : 'Nova resposta'}
          </h3>
          <div style={{ marginBottom: 8, display: 'flex', gap: 4 }}>
            {vars.map((v) => (
              <button key={v} onClick={() => setMessage((p) => p + v)}
                style={{ padding: '2px 8px', background: colors.surface2, border: 'none', borderRadius: 4, color: colors.accent, cursor: 'pointer', fontSize: 12 }}>
                {v}
              </button>
            ))}
          </div>
          <input placeholder="Nome da resposta" value={name} onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', marginBottom: 8, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.text }} />
          <textarea placeholder="Mensagem... use {nome}, {telefone}" value={message} onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{ width: '100%', padding: '8px 12px', marginBottom: 8, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.text, resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{
              padding: '8px 16px', background: colors.accent, color: '#0f1a14', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            {editingId && <button onClick={handleCancel} style={{
              padding: '8px 16px', background: colors.textDim, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}>Cancelar</button>}
          </div>
        </div>

        <div style={{ background: colors.surface, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Respostas salvas</h3>
          {templates.map((t) => (
            <div key={t.id} style={{ padding: '12px 0 14px', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.name}</div>
              <div style={{
                color: colors.textMuted,
                fontSize: 12,
                lineHeight: 1.45,
                maxHeight: 58,
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: 10,
              }}>
                {t.message}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={() => handleEdit(t)} style={{ background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', fontSize: 12, padding: 0 }}>Editar</button>
                <button onClick={() => { if (confirm('Remover?')) { window.zap.deleteTemplate(t.id).then(load) } }}
                  style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 12, padding: 0 }}>Remover</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p style={{ fontSize: 12, color: colors.textDim }}>Nenhuma resposta salva</p>}
        </div>
      </div>
    </div>
  )
}

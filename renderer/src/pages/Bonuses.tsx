import React, { useMemo, useState } from 'react'
import { bonusTemplates } from '../data/bonusTemplates'
import { useTheme } from '../theme'

const guide = [
  { title: 'Comece frio devagar', text: 'Números novos devem ficar entre 30 e 50 mensagens por dia, com delay alto e contatos conhecidos.' },
  { title: 'Use variações reais', text: 'Evite mandar o mesmo texto para todo mundo. Troque abertura, CTA e ordem das frases.' },
  { title: 'Pausas protegem a conta', text: 'Faça pausas longas a cada bloco de mensagens. Volume linear por horas seguidas parece automação agressiva.' },
  { title: 'Higienize listas', text: 'Remova números inválidos, duplicados e contatos sem relação com sua oferta antes do disparo.' },
  { title: 'Priorize resposta', text: 'Mensagens que geram conversa são melhores que textos longos com cara de panfleto.' },
  { title: 'Não prometa spam seguro', text: 'O sistema reduz risco operacional, mas envio abusivo sempre aumenta bloqueio e denúncia.' },
]

export default function Bonuses() {
  const { colors } = useTheme()
  const [category, setCategory] = useState('Todos')
  const [copied, setCopied] = useState('')
  const categories = ['Todos', 'Vendas', 'Recuperação', 'Relacionamento', 'Atendimento']
  const templates = useMemo(
    () => category === 'Todos' ? bonusTemplates : bonusTemplates.filter((t) => t.category === category),
    [category],
  )

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 1400)
  }

  async function saveTemplate(t: typeof bonusTemplates[number]) {
    await window.zap.saveTemplate({ name: t.name.replace(/^\d+\.\s*/, ''), message: t.message })
    setCopied(`save-${t.id}`)
    setTimeout(() => setCopied(''), 1400)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: colors.accent, textTransform: 'uppercase', marginBottom: 6 }}>Bônus liberados</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Guia Anti-Ban + 20 Templates</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, maxWidth: 680, lineHeight: 1.6, marginTop: 8 }}>
            Materiais prometidos na oferta, agora dentro do aplicativo. Copie uma mensagem ou salve direto na biblioteca de templates.
          </p>
        </div>
        <button onClick={async () => {
          for (const t of bonusTemplates) await window.zap.saveTemplate({ name: t.name.replace(/^\d+\.\s*/, ''), message: t.message })
          setCopied('all')
          setTimeout(() => setCopied(''), 1600)
        }} style={{
          padding: '10px 16px', border: 'none', borderRadius: 8, background: colors.accent, color: '#0f1a14',
          cursor: 'pointer', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
        }}>
          {copied === 'all' ? 'Importado' : 'Importar 20 templates'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.6fr', gap: 18 }}>
        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: colors.accent, fontSize: 16, marginTop: 0, marginBottom: 14 }}>Guia rápido anti-ban</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {guide.map((item) => (
              <div key={item.title} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{item.title}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.55, marginTop: 4 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '7px 10px', borderRadius: 999, border: `1px solid ${category === c ? colors.accent : colors.border}`,
                background: category === c ? colors.successBg : colors.bg, color: category === c ? colors.accent : colors.textMuted,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
                {c}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, maxHeight: 515, overflow: 'auto', paddingRight: 4 }}>
            {templates.map((t) => (
              <article key={t.id} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: colors.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{t.category}</div>
                <h4 style={{ fontSize: 14, margin: '6px 0 4px', color: colors.text }}>{t.name}</h4>
                <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.45, minHeight: 34, margin: 0 }}>{t.description}</p>
                <pre style={{
                  whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 11, lineHeight: 1.45, color: colors.textMuted,
                  background: colors.surface2, borderRadius: 8, padding: 10, maxHeight: 120, overflow: 'hidden', margin: '10px 0',
                }}>{t.message}</pre>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copy(t.message, t.id)} style={{ flex: 1, padding: 8, border: `1px solid ${colors.border2}`, borderRadius: 7, background: colors.surface, color: colors.text, cursor: 'pointer', fontSize: 12 }}>
                    {copied === t.id ? 'Copiado' : 'Copiar'}
                  </button>
                  <button onClick={() => saveTemplate(t)} style={{ flex: 1, padding: 8, border: 'none', borderRadius: 7, background: colors.accent2, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {copied === `save-${t.id}` ? 'Salvo' : 'Salvar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

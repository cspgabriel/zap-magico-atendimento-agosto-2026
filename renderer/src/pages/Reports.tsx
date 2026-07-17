import React, { useEffect, useState } from 'react'
import { useTheme } from '../theme'

export default function Reports() {
  const [log, setLog] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, today: 0, todaySent: 0, todayFailed: 0 })
  const [days, setDays] = useState(7)
  const { colors } = useTheme()

  useEffect(() => { load() }, [days])

  function load() {
    window.zap.getSendLog(days).then(setLog)
    window.zap.getStats().then(setStats)
  }

  function exportCSV() {
    const header = ['telefone', 'mensagem', 'status', 'erro', 'data']
    const rows = log.map((l) => [l.phone, l.message, l.status, l.error || '', l.sent_at])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zap-magico-relatorio-${days}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const successRate = stats.today ? Math.round((stats.todaySent / stats.today) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Relatórios</h2>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '4px 0 0' }}>Acompanhe respostas enviadas, falhas e histórico operacional.</p>
        </div>
        <button onClick={exportCSV} disabled={log.length === 0} style={{
          padding: '8px 14px', background: log.length ? colors.accent : colors.textDim, color: '#0f1a14',
          border: 'none', borderRadius: 6, cursor: log.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700,
        }}>
          Exportar CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Total Enviadas</div>
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.success }}>{stats.todaySent}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Enviadas Hoje</div>
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.danger }}>{stats.todayFailed}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Falhas Hoje</div>
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.today}</div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>Total Hoje · {successRate}% sucesso</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 13, color: colors.textMuted }}>Período:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          style={{ padding: '6px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, color: colors.text, fontSize: 13 }}>
          <option value={1}>Hoje</option>
          <option value={3}>3 dias</option>
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      <div style={{ background: colors.surface, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted }}>Telefone</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted }}>Mensagem</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted }}>Status</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: colors.textMuted }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${colors.bg}` }}>
                <td style={{ padding: '8px 16px' }}>{l.phone}</td>
                <td style={{ padding: '8px 16px', color: colors.textMuted, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                <td style={{ padding: '8px 16px' }}>
                  <span style={{ color: l.status === 'sent' ? colors.success : colors.danger, fontWeight: 600 }}>
                    {l.status === 'sent' ? 'Enviada' : 'Falha'}
                  </span>
                </td>
                <td style={{ padding: '8px 16px', color: colors.textMuted, fontSize: 12 }}>{l.sent_at}</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: colors.textDim }}>Nenhum envio no período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

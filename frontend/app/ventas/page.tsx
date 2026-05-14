'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, clearSession, apiGetOrders } from '@/lib/api'

const fmt = (n: number) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const METHOD_LABELS: Record<string, string> = {
  CASH: '💵 Efectivo', CARD: '💳 Tarjeta', TRANSFER: '📲 Transfer',
  WALLET: '👛 Wallet', QR: '📱 QR', POINTS: '⭐ Puntos',
}

export default function VentasPage() {
  const router = useRouter()
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    apiGetOrders(token)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.cashier?.name?.toLowerCase().includes(search.toLowerCase())

    const created = new Date(o.createdAt)
    const matchFrom = !dateFrom || created >= new Date(dateFrom)
    const matchTo   = !dateTo   || created <= new Date(dateTo + 'T23:59:59')

    return matchSearch && matchFrom && matchTo
  })

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0)
  const totalDiscount = filtered.reduce((s, o) => s + (o.discountAmount || 0), 0)

  const exportCSV = () => {
    const rows = [
      ['Folio', 'Fecha', 'Cajero', 'Cliente', 'Subtotal', 'Descuento', 'Total', 'Método Pago'].join(','),
      ...filtered.map(o => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString('es-MX'),
        o.cashier?.name || '',
        o.customer?.name || '',
        o.subtotal,
        o.discountAmount || 0,
        o.total,
        o.payments?.map((p: any) => p.method).join('|') || '',
      ].join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ background: 'var(--c-surface-1)', borderBottom: '1px solid var(--c-border)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--c-text)' }}>📋 Historial de Ventas</h1>
          <p style={{ color: 'var(--c-text-muted)', fontSize: '13px' }}>{filtered.length} órdenes encontradas</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={exportCSV} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            📥 Exportar CSV
          </button>
          <a href="/dashboard" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            ← Dashboard
          </a>
          <button onClick={() => { clearSession(); router.push('/login') }} style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', fontSize: '12px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Órdenes', value: filtered.length.toString(), color: '#6366f1' },
            { label: 'Ingresos', value: fmt(totalRevenue), color: '#22c55e' },
            { label: 'Descuentos', value: fmt(totalDiscount), color: '#f59e0b' },
            { label: 'Ticket Promedio', value: filtered.length > 0 ? fmt(totalRevenue / filtered.length) : '$0.00', color: '#ec4899' },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{card.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Buscar folio, cliente o cajero..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark"
            style={{ flex: '1', minWidth: '200px', padding: '10px 14px', fontSize: '13px' }}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-dark" style={{ padding: '10px 14px', fontSize: '13px' }} />
          <span style={{ color: 'var(--c-text-muted)' }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-dark" style={{ padding: '10px 14px', fontSize: '13px' }} />
          {(search || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }} style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Orders Table */}
        <div style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: '20px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--c-text-muted)' }}>⏳ Cargando ventas...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--c-text-muted)' }}>📭 No hay ventas que coincidan con los filtros</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: 'var(--c-surface-2)' }}>
                <tr>
                  {['Folio', 'Fecha', 'Cajero', 'Cliente', 'Items', 'Descuento', 'Total', 'Pago', 'Ver'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--c-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--c-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--c-green)', fontFamily: 'monospace' }}>{o.orderNumber}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ padding: '14px 16px' }}>{o.cashier?.name || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>{o.customer?.name || <span style={{ color: 'var(--c-text-muted)' }}>Público General</span>}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--c-text-muted)' }}>{o.items?.length ?? 0}</td>
                    <td style={{ padding: '14px 16px', color: '#f59e0b' }}>{o.discountAmount > 0 ? `-${fmt(o.discountAmount)}` : '—'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--c-green)' }}>{fmt(o.total)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {o.payments?.map((p: any, i: number) => (
                          <span key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
                            {METHOD_LABELS[p.method] || p.method}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => setSelected(o)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        👁 Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-surface-1)', borderRadius: '24px', border: '1px solid var(--c-border)', padding: '32px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '18px' }}>Orden {selected.orderNumber}</h3>
                <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>{new Date(selected.createdAt).toLocaleString('es-MX')}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Cajero', value: selected.cashier?.name || '—' },
                { label: 'Cliente', value: selected.customer?.name || 'Público General' },
                { label: 'Subtotal', value: fmt(selected.subtotal) },
                { label: 'Descuento', value: selected.discountAmount > 0 ? `-${fmt(selected.discountAmount)}` : '—' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--c-surface-2)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--c-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: '13px' }}>Productos</div>
              {selected.items?.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--c-border)', fontSize: '13px' }}>
                  <span>{item.quantity}× {item.product?.name || item.productId}</span>
                  <span style={{ fontWeight: 700 }}>{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700 }}>TOTAL</span>
              <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--c-green)' }}>{fmt(selected.total)}</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Métodos de pago:</div>
              {selected.payments?.map((p: any, i: number) => (
                <div key={i}>{METHOD_LABELS[p.method] || p.method}: {fmt(p.amount)}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

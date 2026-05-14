'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken, getUser, clearSession,
  apiGetDashboardSummary, apiGetTopProducts, apiGetSalesByHour,
  apiGetDashboardFranchise,
  type DashboardSummary, type TopProduct,
} from '@/lib/api'

const fmt  = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct  = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(0) + '%' : '0%'

export default function DashboardPage() {
  const router = useRouter()

  const [summary, setSummary]       = useState<DashboardSummary | null>(null)
  const [topProds, setTopProds]     = useState<TopProduct[]>([])
  const [salesByHour, setSalesByHour] = useState<Array<{ hour: number; orders: number; revenue: number }>>([])
  const [franchiseData, setFranchiseData] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [view, setView]             = useState<'BRANCH' | 'FRANCHISE'>('BRANCH')
  const [userRole, setUserRole]     = useState('')

  useEffect(() => {
    const token = getToken()
    const user = getUser()
    if (!token || !user) { router.replace('/login'); return }
    setUserRole(user.role)

    const calls: Promise<any>[] = [
      apiGetDashboardSummary(token),
      apiGetTopProducts(token),
      apiGetSalesByHour(token),
    ]

    if (user.role === 'OWNER') {
      calls.push(apiGetDashboardFranchise(token))
    }

    Promise.all(calls).then(([s, tp, sbh, franchise]) => {
      setSummary(s)
      setTopProds(tp)
      setSalesByHour(sbh)
      if (franchise) setFranchiseData(franchise)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  const maxHourRevenue = Math.max(...salesByHour.map(h => h.revenue), 1)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: '60px',
        background: 'var(--c-surface-1)', borderBottom: '1px solid var(--c-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--c-green), var(--c-lime-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>🌿</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--c-text)' }}>Natural OS</span>
          <span style={{ fontSize: '13px', color: 'var(--c-text-muted)', paddingLeft: '10px', borderLeft: '1px solid var(--c-border)' }}>
            Dashboard Ejecutivo
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/pos" style={{
            padding: '7px 14px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600,
            background: 'var(--c-green)', color: '#000', textDecoration: 'none',
          }}>💳 Ir al POS</a>
          <button onClick={() => { clearSession(); router.push('/login') }}
            style={{ fontSize: '12px', color: 'var(--c-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--c-text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <div>Cargando métricas...</div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '20px 24px', borderRadius: 'var(--r-lg)',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', marginBottom: '24px',
          }}>
            ⚠️ {error} — Las métricas se calcularán una vez que haya ventas registradas.
          </div>
        )}

        {!loading && summary && (
          <>
            {userRole === 'OWNER' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button onClick={() => setView('BRANCH')} className={view === 'BRANCH' ? 'btn-green' : 'btn-ghost'} style={{ fontSize: '13px' }}>🏪 Esta Sucursal</button>
                <button onClick={() => setView('FRANCHISE')} className={view === 'FRANCHISE' ? 'btn-green' : 'btn-ghost'} style={{ fontSize: '13px' }}>🏢 Modo Franquicia</button>
              </div>
            )}

            {view === 'FRANCHISE' ? (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '20px' }}>📊 Comparativo de Ventas — Hoy</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {franchiseData.map(b => (
                    <div key={b.branchId} style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-xl)', padding: '24px' }}>
                      <div style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>{b.name}</div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--c-green)' }}>{fmt(b.salesToday)}</div>
                      <div style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginTop: '8px' }}>{b.ordersToday} órdenes hoy</div>
                      <div style={{ height: '6px', background: 'var(--c-surface-2)', borderRadius: '3px', marginTop: '16px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--c-green)', 
                          width: franchiseData[0].salesToday > 0 ? (b.salesToday / franchiseData[0].salesToday * 100) + '%' : '0%' 
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '16px', marginBottom: '28px',
                }}>
                  {[
                    { label: 'Ventas Hoy',        value: fmt(summary.salesToday),    sub: `${summary.ordersToday} órdenes`, emoji: '💰', color: '#22c55e' },
                    { label: 'Ventas Semana',     value: fmt(summary.salesWeek),     sub: 'Últimos 7 días',                emoji: '📅', color: '#3b82f6' },
                    { label: 'Ventas Mes',        value: fmt(summary.salesMonth),    sub: 'Últimos 30 días',               emoji: '📆', color: '#8b5cf6' },
                    { label: 'Ticket Promedio',   value: fmt(summary.avgTicket),     sub: 'Por orden hoy',                 emoji: '🧾', color: '#f59e0b' },
                    { label: 'Total Clientes',    value: summary.totalCustomers.toString(), sub: 'Base CRM',              emoji: '👥', color: '#ec4899' },
                    { label: 'Órdenes Hoy',       value: summary.ordersToday.toString(), sub: 'En esta sucursal',         emoji: '📊', color: '#14b8a6' },
                  ].map(card => (
                    <div key={card.label} style={{
                      background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
                      borderRadius: 'var(--r-xl)', padding: '20px 22px',
                      transition: 'var(--t-mid)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--c-text-muted)', fontWeight: 500 }}>{card.label}</span>
                        <span style={{
                          fontSize: '22px', width: '40px', height: '40px', borderRadius: '12px',
                          background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{card.emoji}</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                        {card.value}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginTop: '4px' }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', marginBottom: '28px' }}>

                  {/* Sales by Hour Bar Chart */}
                  <div style={{
                    background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
                    borderRadius: 'var(--r-xl)', padding: '24px',
                  }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '20px' }}>
                      📈 Ventas por Hora — Hoy
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '160px' }}>
                      {salesByHour.map(h => {
                        const heightPct = (h.revenue / maxHourRevenue) * 100
                        const isActive  = h.revenue > 0
                        return (
                          <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                            <div
                              title={`${h.hour}:00 — ${fmt(h.revenue)} (${h.orders} órdenes)`}
                              style={{
                                width: '100%', borderRadius: '4px 4px 0 0',
                                height: `${Math.max(isActive ? heightPct : 2, 2)}%`,
                                background: isActive
                                  ? 'linear-gradient(180deg, var(--c-green), var(--c-lime-dark))'
                                  : 'var(--c-surface-2)',
                                transition: 'height 0.6s ease',
                                cursor: isActive ? 'pointer' : 'default',
                              }}
                            />
                            <span style={{ fontSize: '9px', color: 'var(--c-text-muted)' }}>{h.hour}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--c-text-muted)', textAlign: 'center' }}>
                      Horas del día (6am – 10pm). Pasa el cursor sobre las barras para ver detalle.
                    </div>
                  </div>

                  {/* Top Products */}
                  <div style={{
                    background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
                    borderRadius: 'var(--r-xl)', padding: '24px',
                  }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '20px' }}>
                      🏆 Top Productos — 30 días
                    </h3>
                    {topProds.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-muted)', fontSize: '13px' }}>
                        Aún no hay datos de ventas.<br />Empieza a vender desde el POS.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {topProds.slice(0, 6).map((p, i) => (
                          <div key={p.productId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                              background: i < 3 ? 'rgba(245,158,11,0.2)' : 'var(--c-surface-2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700, color: i < 3 ? '#f59e0b' : 'var(--c-text-muted)',
                            }}>{i + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                <div style={{
                                  height: '4px', borderRadius: '2px', background: 'var(--c-surface-2)',
                                  flex: 1, overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%', borderRadius: '2px',
                                    background: 'linear-gradient(90deg, var(--c-green), var(--c-lime-dark))',
                                    width: pct(p.totalRevenue, topProds[0].totalRevenue),
                                    transition: 'width 0.8s ease',
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
                                  {p.totalQty} uds
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-green)', whiteSpace: 'nowrap' }}>
                              {fmt(p.totalRevenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Footer */}
                <div style={{
                  background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r-xl)', padding: '20px 24px',
                  display: 'flex', gap: '32px', flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'Tasa de conversión (hoy)', value: summary.ordersToday > 0 ? '100%' : '—' },
                    { label: 'Ingresos vs semana', value: summary.salesWeek > 0 ? fmt(summary.salesWeek / 7) + '/día' : '—' },
                    { label: 'Ingresos vs mes', value: summary.salesMonth > 0 ? fmt(summary.salesMonth / 30) + '/día' : '—' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '4px' }}>{stat.label}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--c-text)' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

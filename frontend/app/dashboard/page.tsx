'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken, getUser, clearSession,
  apiGetDashboardSummary, apiGetTopProducts, apiGetSalesByHour,
  apiGetDashboardFranchise,
  apiGetOrders,
  type DashboardSummary, type TopProduct,
} from '@/lib/api'
import { getSocket, disconnectSocket } from '@/lib/socket'

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
  const [riskToast, setRiskToast]   = useState<string | null>(null)

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

    // Real-time updates
    const socket = getSocket(user.organizationId)
    socket.on('new_order', () => {
      // Refresh only summary and hour chart
      apiGetDashboardSummary(token).then(setSummary)
      apiGetSalesByHour(token).then(setSalesByHour)
    })
    socket.on('risk_alert', (alert: any) => {
      setRiskToast(`🚨 ${alert.description || 'Nueva alerta de riesgo'}`)
      setTimeout(() => setRiskToast(null), 6000)
    })

    return () => {
      socket.off('new_order')
      socket.off('risk_alert')
    }
  }, [router])

  const handleExportCSV = async () => {
    const token = getToken()
    if (!token) return
    try {
      const orders = await apiGetOrders(token)
      const headers = ['Folio', 'Fecha', 'Sucursal', 'Cajero', 'Cliente', 'Total', 'Metodo Pago']
      const rows = orders.map((o: any) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString(),
        o.branch?.name || '—',
        o.user?.name || '—',
        o.customer?.name || 'General',
        o.total,
        o.paymentMethod
      ])
      
      const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', `Ventas_NaturaPOS_${new Date().toLocaleDateString()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      setError('Error exportando CSV')
    }
  }

  const maxHourRevenue = Math.max(...salesByHour.map(h => h.revenue), 1)

  return (
    <div className="min-h-screen bg-black font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-7 h-15 bg-zinc-950 border-b border-zinc-900 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-linear-to-br from-green-500 to-lime-600 flex items-center justify-center text-lg md:text-xl">🌿</div>
          <span className="font-bold text-base text-white hide-mobile">Natural OS</span>
          <span className="text-xs text-zinc-500 pl-2.5 border-l border-zinc-800 hide-mobile">
            Dashboard Ejecutivo
          </span>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={handleExportCSV} className="flex px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 gap-2 items-center">
            📥 Reporte CSV
          </button>
          <a href="/pos" className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-green-500 text-black no-underline hover:brightness-110">💳 Ir al POS</a>
          <a href="/profile" title="Mi Perfil" className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 hover:border-green-500 flex items-center justify-center text-xs font-black text-white no-underline transition-colors">
            {getUser()?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </a>
          <button onClick={() => { clearSession(); router.push('/login') }}
            className="text-xs text-zinc-500 bg-transparent border-none cursor-pointer hover:text-white">
            Salir
          </button>
        </div>
      </header>

      <main className="p-4 md:p-7 max-w-7xl mx-auto space-y-6">

        {riskToast && (
          <div className="fixed top-4 right-4 z-50 animate-fadeIn p-4 rounded-xl bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-500/30 flex items-center gap-3">
            {riskToast}
            <button onClick={() => setRiskToast(null)} className="ml-2 text-white/70 hover:text-white bg-transparent border-none cursor-pointer text-lg">×</button>
          </div>
        )}

        {loading && (
          <div className="text-center py-20 text-zinc-500">
            <div className="text-4xl mb-4">⏳</div>
            <div>Cargando métricas...</div>
          </div>
        )}

        {error && (
          <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 mb-6">
            ⚠️ {error} — Las métricas se calcularán una vez que haya ventas registradas.
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { href: '/pos',           emoji: '💳', label: 'Punto de Venta',   color: '#22c55e' },
            { href: '/cash-register', emoji: '💰', label: 'Corte de Caja',    color: '#f59e0b' },
            { href: '/ventas',        emoji: '📋', label: 'Historial Ventas', color: '#6366f1' },
            { href: '/admin',         emoji: '⚙️', label: 'Administrar',      color: '#8b5cf6' },
            { href: '/profile',       emoji: '👤', label: 'Mi Perfil',        color: '#ec4899' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{ textDecoration: 'none' }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-900 bg-zinc-950 hover:border-zinc-700 transition-all hover:-translate-y-0.5"
            >
              <span style={{ fontSize: '24px' }}>{a.emoji}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: a.color, textAlign: 'center' }}>{a.label}</span>
            </a>
          ))}
        </div>

        {!loading && summary && (
          <>
            {userRole === 'OWNER' && (
              <div className="flex gap-2 mb-6">
                <button onClick={() => setView('BRANCH')} className={view === 'BRANCH' ? 'btn-green px-4 py-1.5' : 'btn-ghost px-4 py-1.5'} style={{ fontSize: '13px' }}>🏪 Esta Sucursal</button>
                <button onClick={() => setView('FRANCHISE')} className={view === 'FRANCHISE' ? 'btn-green px-4 py-1.5' : 'btn-ghost px-4 py-1.5'} style={{ fontSize: '13px' }}>🏢 Modo Franquicia</button>
              </div>
            )}

            {view === 'FRANCHISE' ? (
              <div className="animate-fadeIn">
                <h3 className="text-lg font-bold text-white mb-5">📊 Comparativo de Ventas — Hoy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {franchiseData.map(b => (
                    <div key={b.branchId} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
                      <div className="text-sm text-zinc-400 mb-2">{b.name}</div>
                      <div className="text-3xl font-black text-green-500">{fmt(b.salesToday)}</div>
                      <div className="text-xs text-zinc-500 mt-2">{b.ordersToday} órdenes hoy</div>
                      <div className="h-1.5 bg-zinc-900 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-1000" style={{ 
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-7">
                  {[
                    { label: 'Ventas Hoy',        value: fmt(summary.salesToday),    sub: `${summary.ordersToday} órdenes`, emoji: '💰', color: '#22c55e' },
                    { label: 'Ventas Semana',     value: fmt(summary.salesWeek),     sub: 'Últimos 7 días',                emoji: '📅', color: '#3b82f6' },
                    { label: 'Ventas Mes',        value: fmt(summary.salesMonth),    sub: 'Últimos 30 días',               emoji: '📆', color: '#8b5cf6' },
                    { label: 'Ticket Promedio',   value: fmt(summary.avgTicket),     sub: 'Por orden hoy',                 emoji: '🧾', color: '#f59e0b' },
                    { label: 'Total Clientes',    value: summary.totalCustomers.toString(), sub: 'Base CRM',              emoji: '👥', color: '#ec4899' },
                    { label: 'Órdenes Hoy',       value: summary.ordersToday.toString(), sub: 'En esta sucursal',         emoji: '📊', color: '#14b8a6' },
                  ].map(card => (
                    <div key={card.label} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 hover:border-zinc-800 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{card.label}</span>
                        <span className="text-xl w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">{card.emoji}</span>
                      </div>
                      <div className="text-2xl font-black text-white tabular-nums">
                        {card.value}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">

                  {/* Sales by Hour Bar Chart */}
                  <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider opacity-60">
                      📈 Ventas por Hora — Hoy
                    </h3>
                    <div className="flex items-end gap-1.5 md:gap-2 h-40">
                      {salesByHour.map(h => {
                        const heightPct = (h.revenue / maxHourRevenue) * 100
                        const isActive  = h.revenue > 0
                        return (
                          <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end gap-1.5">
                            <div
                              title={`${h.hour}:00 — ${fmt(h.revenue)} (${h.orders} órdenes)`}
                              className={`w-full rounded-t-sm transition-all duration-700 ${
                                isActive ? 'bg-linear-to-b from-green-400 to-green-600 cursor-pointer hover:brightness-125' : 'bg-zinc-900'
                              }`}
                              style={{ height: `${Math.max(isActive ? heightPct : 2, 2)}%` }}
                            />
                            <span className="text-[9px] text-zinc-600 font-medium">{h.hour}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider opacity-60">
                      🏆 Top Productos — 30 días
                    </h3>
                    {topProds.length === 0 ? (
                      <div className="text-center py-8 text-zinc-600 text-xs">
                        No hay datos aún.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topProds.slice(0, 5).map((p, i) => (
                          <div key={p.productId} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                              i < 3 ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-900 text-zinc-500'
                            }`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-zinc-200 truncate">{p.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-1 bg-zinc-900 rounded-full flex-1 overflow-hidden">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: pct(p.totalRevenue, topProds[0].totalRevenue) }} />
                                </div>
                                <span className="text-[10px] text-zinc-600 whitespace-nowrap">{p.totalQty} uds</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-green-500 whitespace-nowrap">{fmt(p.totalRevenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Footer */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row gap-6 md:gap-10">
                  {[
                    { label: 'Tasa de conversión', value: summary.ordersToday > 0 ? '100%' : '—' },
                    { label: 'Ingresos vs semana', value: summary.salesWeek > 0 ? fmt(summary.salesWeek / 7) + '/día' : '—' },
                    { label: 'Ingresos vs mes', value: summary.salesMonth > 0 ? fmt(summary.salesMonth / 30) + '/día' : '—' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</div>
                      <div className="text-lg font-black text-white">{stat.value}</div>
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

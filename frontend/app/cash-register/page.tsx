'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken,
  apiGetActiveRegister,
  apiOpenRegister,
  apiCloseRegister,
  apiGetRegisterHistory,
  apiGetOrders,
  apiGetRegisterBreakdown,
  type CashRegister,
} from '@/lib/api'

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function CashRegisterPage() {
  const router = useRouter()
  const [activeReg, setActiveReg] = useState<CashRegister | null>(null)
  const [history, setHistory]     = useState<CashRegister[]>([])
  const [loading, setLoading]     = useState(true)
  const [viewedCut, setViewedCut] = useState<{h: CashRegister, cut: any} | null>(null)
  const [viewedBreakdown, setViewedBreakdown] = useState<{h: CashRegister, items: any[]} | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)

  // Forms
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes]                 = useState('')
  const [error, setError]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [closeSummary, setCloseSummary]   = useState<any>(null)
  const [todayOrders, setTodayOrders]     = useState<any[]>([])

  const loadData = async () => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    setLoading(true)
    try {
      const [active, hist, orders] = await Promise.all([
        apiGetActiveRegister(token),
        apiGetRegisterHistory(token),
        apiGetOrders(token).catch(() => []),
      ])
      setActiveReg(active)
      setHistory(hist)
      setTodayOrders(orders)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [router])

  const handleOpen = async () => {
    const token = getToken()
    if (!token || !openingAmount) return
    setSubmitting(true); setError('')
    try {
      await apiOpenRegister(token, Number(openingAmount))
      await loadData()
      setOpeningAmount('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async () => {
    const token = getToken()
    if (!token || !activeReg || !closingAmount) return
    setSubmitting(true); setError('')
    try {
      const result = await apiCloseRegister(token, activeReg.id, Number(closingAmount), notes)
      setCloseSummary(result?.summary || null)
      await loadData()
      setClosingAmount('')
      setNotes('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewBreakdown = async (h: CashRegister) => {
    const token = getToken()
    if (!token) return
    setLoadingBreakdown(true)
    try {
      const items = await apiGetRegisterBreakdown(token, h.id)
      setViewedBreakdown({ h, items })
    } catch (e: any) {
      alert('Error cargando desglose: ' + e.message)
    } finally {
      setLoadingBreakdown(false)
    }
  }

  return (
    <div className="min-h-screen bg-black font-sans p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Corte de Caja (Dual)</h1>
            <p className="text-sm text-zinc-500 mt-1">Gestión de caja y cortes administrativos vs fiscales</p>
          </div>
          <a href="/pos" className="btn-ghost px-5 py-2 text-sm no-underline inline-flex items-center gap-2">
            <span>💳</span> Volver al POS
          </a>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 mb-6 animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {closeSummary && (
          <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/30 mb-6 animate-fadeIn">
            <h3 className="text-green-500 font-black text-lg mb-3">✅ Corte Generado Exitosamente</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-[10px] text-zinc-500 uppercase tracking-widest">Ventas Totales</div><div className="text-xl font-black text-white">{fmt(closeSummary.totalSales || 0)}</div></div>
              <div><div className="text-[10px] text-zinc-500 uppercase tracking-widest">Efectivo</div><div className="text-xl font-black text-white">{fmt(closeSummary.totalCash || 0)}</div></div>
              <div><div className="text-[10px] text-zinc-500 uppercase tracking-widest">Órdenes</div><div className="text-xl font-black text-white">{closeSummary.ordersCount || 0}</div></div>
              <div><div className="text-[10px] text-zinc-500 uppercase tracking-widest">Diferencia</div><div className={`text-xl font-black ${(closeSummary.difference || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>{fmt(closeSummary.difference || 0)}</div></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Register Panel */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            {loading ? (
              <div className="text-center py-10 text-zinc-600 animate-pulse">Cargando estado de caja...</div>
            ) : !activeReg ? (
              // OPEN REGISTER
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"></span>
                  <h2 className="text-xl font-bold text-white">Caja Cerrada</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Fondo de caja inicial</label>
                    <input 
                      type="number" 
                      value={openingAmount} 
                      onChange={e => setOpeningAmount(e.target.value)}
                      placeholder="$0.00" 
                      className="input-dark w-full text-2xl p-4 font-black text-green-500" 
                    />
                  </div>
                  <button 
                    onClick={handleOpen} 
                    disabled={submitting || !openingAmount} 
                    className="btn-green w-full py-4 text-base shadow-xl shadow-green-500/10"
                  >
                    {submitting ? 'Abriendo...' : 'ABRIR CAJA'}
                  </button>
                </div>
              </div>
            ) : (
              // CLOSE REGISTER
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]"></span>
                  <h2 className="text-xl font-bold text-white">Caja Abierta</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-8 border-l-2 border-zinc-800 pl-3">
                  Desde: <span className="text-zinc-300 font-medium">{new Date(activeReg.openedAt).toLocaleTimeString('es-MX')}</span>
                  <br/>Fondo: <span className="text-green-500 font-bold">{fmt(activeReg.openingAmount)}</span>
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Efectivo físico al cierre</label>
                    <input 
                      type="number" 
                      value={closingAmount} 
                      onChange={e => setClosingAmount(e.target.value)}
                      placeholder="$0.00" 
                      className="input-dark w-full text-2xl p-4 font-black text-green-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Notas (opcional)</label>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)}
                      className="input-dark w-full min-h-[100px] p-3 text-sm" 
                      placeholder="Reportar incidencias o motivos de diferencia..."
                    />
                  </div>
                  
                  <button 
                    onClick={handleClose} 
                    disabled={submitting || !closingAmount} 
                    className="btn-green w-full py-4 text-base"
                  >
                    {submitting ? 'Cerrando...' : 'REALIZAR CORTE DE CAJA'}
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-medium">
                    Se generará automáticamente Corte A (Real) y B (Fiscal).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History Panel */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span>📋</span> Historial de Cortes
            </h2>
            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 pr-1 no-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-20 text-zinc-700">
                  <div className="text-4xl mb-2 opacity-10">📜</div>
                  <div className="text-xs uppercase tracking-widest">Sin historial</div>
                </div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 hover:bg-zinc-900 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-zinc-200">{new Date(h.openedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase ${
                        h.status === 'CLOSED' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {h.status === 'CLOSED' ? 'Cerrada' : 'Abierta'}
                      </span>
                    </div>
                    
                    {h.status === 'CLOSED' && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="text-[9px] uppercase tracking-widest text-zinc-600">Sistema</div>
                          <div className="text-sm font-bold text-zinc-300">{fmt(h.expectedAmount || 0)}</div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-[9px] uppercase tracking-widest text-zinc-600">Físico</div>
                          <div className="text-sm font-bold text-white">{fmt(h.closingAmount || 0)}</div>
                        </div>
                        <div className="col-span-full pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                          <span className="text-[10px] text-zinc-500 uppercase font-medium">Diferencia</span>
                          <span className={`text-sm font-black ${ (h.difference || 0) < 0 ? 'text-red-500' : (h.difference || 0) > 0 ? 'text-blue-500' : 'text-green-500'}`}>
                            {fmt(h.difference || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {h.cuts && h.cuts.length > 0 && (
                       <div className="flex gap-2 pt-3 border-t border-zinc-800/50 overflow-x-auto no-scrollbar">
                         <button onClick={() => setViewedCut({h, cut: h.cuts!.find(c=>c.type==='ADMIN')})} className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md whitespace-nowrap border-none cursor-pointer hover:bg-blue-500/20 transition-colors">
                           📄 VER CORTE A: {fmt(h.cuts.find(c=>c.type==='ADMIN')?.totalSales || 0)}
                         </button>
                         <button onClick={() => setViewedCut({h, cut: h.cuts!.find(c=>c.type==='FISCAL')})} className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md whitespace-nowrap border-none cursor-pointer hover:bg-purple-500/20 transition-colors">
                           📄 VER CORTE B
                         </button>
                         <button onClick={() => handleViewBreakdown(h)} disabled={loadingBreakdown} className="text-[9px] font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded-md whitespace-nowrap border-none cursor-pointer hover:bg-green-500/20 transition-colors">
                           📦 DESGLOSE DE PRODUCTOS
                         </button>
                       </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal para ver el detalle del Corte */}
      {viewedCut && viewedCut.cut && (
        <div className="modal-overlay no-print" onClick={() => setViewedCut(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: 0, overflow: 'hidden' }}>
            <div style={{ background: viewedCut.cut.type === 'ADMIN' ? '#1e3a8a' : '#581c87', padding: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>
                CORTE {viewedCut.cut.type === 'ADMIN' ? 'A (Interno)' : 'B (Fiscal)'}
              </h2>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                Apertura: {new Date(viewedCut.h.openedAt).toLocaleString('es-MX')} <br/>
                Cierre: {viewedCut.h.closedAt ? new Date(viewedCut.h.closedAt).toLocaleString('es-MX') : 'Abierta'}
              </div>
            </div>

            <div style={{ padding: '24px', background: 'var(--c-surface-1)', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>Ventas Totales</span>
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--c-text)' }}>{fmt(viewedCut.cut.totalSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>En Efectivo</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--c-text)' }}>{fmt(viewedCut.cut.totalCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>En Tarjeta/Transf</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--c-text)' }}>{fmt(viewedCut.cut.totalCard)}</span>
              </div>
              
              <div style={{ borderTop: '1px dashed var(--c-border)', margin: '16px 0' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>Fondo Inicial</span>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--c-text)' }}>{fmt(viewedCut.h.openingAmount)}</span>
              </div>
              
              {viewedCut.cut.type === 'ADMIN' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>Físico Registrado</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--c-text)' }}>{fmt(viewedCut.h.closingAmount || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', background: 'var(--c-surface-2)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: '14px', fontWeight: 'bold' }}>Diferencia / Descuadre</span>
                    <span style={{ fontWeight: 900, fontSize: '16px', color: (viewedCut.h.difference || 0) < 0 ? 'var(--c-error)' : 'var(--c-green)' }}>
                      {fmt(viewedCut.h.difference || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '12px' }}>
              <button onClick={() => window.print()} className="btn-green" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="text-lg">📄</span> Imprimir PDF
              </button>
              <button onClick={() => setViewedCut(null)} className="btn-ghost" style={{ padding: '12px 24px', fontSize: '14px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket imprimible oculto para Cortes */}
      {viewedCut && viewedCut.cut && (
        <div id="printable-ticket" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0', fontSize: '18px' }}>NATURAL BY NUTRIT</h2>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>
              REPORTE DE CORTE {viewedCut.cut.type === 'ADMIN' ? 'A (INTERNO)' : 'B (FISCAL)'}
            </p>
            <p style={{ margin: '0', fontSize: '10px' }}>ID Caja: {viewedCut.h.id.split('-')[0]}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
          
          <div style={{ marginBottom: '10px', fontSize: '11px' }}>
            <p style={{ margin: '0' }}><strong>Apertura:</strong> {new Date(viewedCut.h.openedAt).toLocaleString('es-MX')}</p>
            <p style={{ margin: '0' }}><strong>Cierre:</strong> {viewedCut.h.closedAt ? new Date(viewedCut.h.closedAt).toLocaleString('es-MX') : 'Abierta'}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

          <table style={{ width: '100%', fontSize: '12px', marginBottom: '10px' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '4px' }}>Fondo Inicial:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{fmt(viewedCut.h.openingAmount)}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '4px' }}>Ventas Totales:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold' }}>{fmt(viewedCut.cut.totalSales)}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '4px' }}>- Efectivo:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{fmt(viewedCut.cut.totalCash)}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '4px' }}>- Otros (Tarjeta/QR):</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{fmt(viewedCut.cut.totalCard)}</td>
              </tr>
            </tbody>
          </table>

          {viewedCut.cut.type === 'ADMIN' && (
            <>
              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
              <table style={{ width: '100%', fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: '4px' }}>Efectivo Físico Reportado:</td>
                    <td style={{ textAlign: 'right', paddingBottom: '4px' }}>{fmt(viewedCut.h.closingAmount || 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: '4px', fontWeight: 'bold' }}>Diferencia / Descuadre:</td>
                    <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold' }}>{fmt(viewedCut.h.difference || 0)}</td>
                  </tr>
                </tbody>
              </table>
              
              {viewedCut.h.notes && (
                <div style={{ marginTop: '10px', fontSize: '10px' }}>
                  <strong>Notas del Cajero:</strong><br/>
                  {viewedCut.h.notes}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px' }}>
            <p>___________________________________</p>
            <p>Firma de Conformidad</p>
          </div>
        </div>
      )}

      {/* Modal para Desglose de Productos */}
      {viewedBreakdown && (
        <div className="modal-overlay no-print" onClick={() => setViewedBreakdown(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#059669', padding: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>
                DESGLOSE DE PRODUCTOS
              </h2>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                Apertura: {new Date(viewedBreakdown.h.openedAt).toLocaleString('es-MX')} <br/>
                Cierre: {viewedBreakdown.h.closedAt ? new Date(viewedBreakdown.h.closedAt).toLocaleString('es-MX') : 'Abierta'}
              </div>
            </div>

            <div style={{ padding: '24px', background: 'var(--c-surface-1)', maxHeight: '400px', overflowY: 'auto' }}>
              {viewedBreakdown.items.length === 0 ? (
                <div className="text-center text-zinc-500 py-10">No hubo ventas registradas en este turno.</div>
              ) : (
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium text-center">Cant.</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewedBreakdown.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-zinc-900/50">
                        <td className="py-3 font-medium text-white">{item.name}</td>
                        <td className="py-3 text-center">{item.qty}</td>
                        <td className="py-3 text-right font-bold text-green-400">{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '12px' }}>
              <button onClick={() => {
                // Se asegura de ocultar primero el modal anterior para que no interfiera en la impresión
                setViewedCut(null);
                setTimeout(() => window.print(), 100);
              }} className="btn-green" style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="text-lg">📄</span> Imprimir Desglose
              </button>
              <button onClick={() => setViewedBreakdown(null)} className="btn-ghost" style={{ padding: '12px 24px', fontSize: '14px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket imprimible oculto para Desglose */}
      {viewedBreakdown && (
        <div id="printable-ticket" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0', fontSize: '18px' }}>NATURAL BY NUTRIT</h2>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>
              REPORTE DE VENTAS POR PRODUCTO
            </p>
            <p style={{ margin: '0', fontSize: '10px' }}>ID Caja: {viewedBreakdown.h.id.split('-')[0]}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
          
          <div style={{ marginBottom: '10px', fontSize: '11px' }}>
            <p style={{ margin: '0' }}><strong>Apertura:</strong> {new Date(viewedBreakdown.h.openedAt).toLocaleString('es-MX')}</p>
            <p style={{ margin: '0' }}><strong>Cierre:</strong> {viewedBreakdown.h.closedAt ? new Date(viewedBreakdown.h.closedAt).toLocaleString('es-MX') : 'Abierta'}</p>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

          <table style={{ width: '100%', fontSize: '11px', marginBottom: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Producto</th>
                <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Cant.</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {viewedBreakdown.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', paddingTop: '4px', paddingBottom: '4px' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', paddingTop: '4px', paddingBottom: '4px' }}>{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ borderTop: '1px solid #000', margin: '10px 0' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
             <span>TOTAL DE PRODUCTOS:</span>
             <span>{viewedBreakdown.items.reduce((s, i) => s + i.qty, 0)} items</span>
          </div>

        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken,
  apiGetActiveRegister,
  apiOpenRegister,
  apiCloseRegister,
  apiGetRegisterHistory,
  type CashRegister,
} from '@/lib/api'

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function CashRegisterPage() {
  const router = useRouter()
  const [activeReg, setActiveReg] = useState<CashRegister | null>(null)
  const [history, setHistory]     = useState<CashRegister[]>([])
  const [loading, setLoading]     = useState(true)

  // Forms
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes]                 = useState('')
  const [error, setError]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)

  const loadData = async () => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    setLoading(true)
    try {
      const [active, hist] = await Promise.all([
        apiGetActiveRegister(token),
        apiGetRegisterHistory(token),
      ])
      setActiveReg(active)
      setHistory(hist)
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
      await apiCloseRegister(token, activeReg.id, Number(closingAmount), notes)
      await loadData()
      setClosingAmount('')
      setNotes('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
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
                         <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md whitespace-nowrap">CORTE A: {fmt(h.cuts.find(c=>c.type==='ADMIN')?.totalSales || 0)}</span>
                         <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md whitespace-nowrap">CORTE B: GENERADO</span>
                       </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

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
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit', padding: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--c-text)' }}>Corte de Caja (Dual)</h1>
            <p style={{ color: 'var(--c-text-muted)' }}>Gestión de caja y cortes administrativos vs fiscales</p>
          </div>
          <a href="/pos" className="btn-ghost" style={{ textDecoration: 'none' }}>💳 Volver al POS</a>
        </div>

        {error && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Active Register Panel */}
          <div style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-xl)', padding: '28px' }}>
            {loading ? <div>Cargando...</div> : !activeReg ? (
              // OPEN REGISTER
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: 'var(--c-text)' }}>🔴 Caja Cerrada</h2>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>Fondo de caja inicial</label>
                  <input type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                         placeholder="$0.00" className="input-dark" style={{ width: '100%', fontSize: '18px', padding: '12px' }} />
                </div>
                <button onClick={handleOpen} disabled={submitting || !openingAmount} className="btn-green" style={{ width: '100%', padding: '14px' }}>
                  {submitting ? 'Abriendo...' : 'Abrir Caja'}
                </button>
              </div>
            ) : (
              // CLOSE REGISTER
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-green)' }}>🟢 Caja Abierta</h2>
                <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '24px' }}>
                  Abierta a las: {new Date(activeReg.openedAt).toLocaleTimeString('es-MX')}
                  <br/>Fondo inicial: {fmt(activeReg.openingAmount)}
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>Efectivo físico en caja al cierre</label>
                  <input type="number" value={closingAmount} onChange={e => setClosingAmount(e.target.value)}
                         placeholder="$0.00" className="input-dark" style={{ width: '100%', fontSize: '18px', padding: '12px' }} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>Notas o justificaciones (opcional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            className="input-dark" style={{ width: '100%', minHeight: '80px' }} />
                </div>
                
                <button onClick={handleClose} disabled={submitting || !closingAmount} className="btn-green" style={{ width: '100%', padding: '14px', background: 'var(--c-surface-3)', borderColor: 'var(--c-border)' }}>
                  {submitting ? 'Cerrando...' : 'Realizar Corte de Caja'}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '12px', textAlign: 'center' }}>
                  Esto generará automáticamente el Corte A (Real) y el Corte B (Fiscal).
                </p>
              </div>
            )}
          </div>

          {/* History Panel */}
          <div style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-xl)', padding: '28px', overflowY: 'auto', maxHeight: '600px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--c-text)' }}>Historial de Cortes</h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--c-text-muted)', fontSize: '13px' }}>No hay historial reciente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {history.map(h => (
                  <div key={h.id} style={{ background: 'var(--c-surface-2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{new Date(h.openedAt).toLocaleDateString('es-MX')}</span>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: h.status === 'CLOSED' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: h.status === 'CLOSED' ? '#22c55e' : '#f59e0b' }}>
                        {h.status}
                      </span>
                    </div>
                    {h.status === 'CLOSED' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                        <div style={{ color: 'var(--c-text-muted)' }}>Esperado: <span style={{ color: 'var(--c-text)' }}>{fmt(h.expectedAmount || 0)}</span></div>
                        <div style={{ color: 'var(--c-text-muted)' }}>Físico: <span style={{ color: 'var(--c-text)' }}>{fmt(h.closingAmount || 0)}</span></div>
                        <div style={{ gridColumn: '1/-1', color: (h.difference || 0) < 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                          Diferencia: {fmt(h.difference || 0)}
                        </div>
                      </div>
                    )}
                    {h.cuts && h.cuts.length > 0 && (
                       <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: '8px' }}>
                         <span style={{ fontSize: '11px', background: '#3b82f640', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>Corte A: {fmt(h.cuts.find(c=>c.type==='ADMIN')?.totalSales || 0)}</span>
                         <span style={{ fontSize: '11px', background: '#8b5cf640', color: '#c084fc', padding: '2px 6px', borderRadius: '4px' }}>Corte B: Generado</span>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

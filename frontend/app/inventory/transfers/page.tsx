// frontend/app/inventory/transfers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getToken, 
  apiGetTransfers, 
  apiGetTransferBranches, 
  apiCreateTransfer, 
  apiUpdateTransferStatus,
  apiGetInventory
} from '@/lib/api'

export default function TransfersPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // New transfer form
  const [toBranchId, setToBranchId] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<any[]>([])

  // Custom Toast State
  const [toasts, setToasts] = useState<string[]>([])
  const addToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 4000)
  }

  const loadData = async () => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    setLoading(true)
    try {
      const [t, b, i] = await Promise.all([
        apiGetTransfers(token),
        apiGetTransferBranches(token),
        apiGetInventory(token)
      ])
      setTransfers(t)
      setBranches(b)
      setInventory(i)
    } catch (e) {
      console.error(e)
      addToast('❌ Error al cargar datos de transferencia')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [router])

  const addItem = () => {
    if (!selectedItem || !quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      addToast('⚠️ Selecciona un artículo e ingresa una cantidad válida')
      return
    }
    const invItem = inventory.find(i => i.id === selectedItem)
    if (!invItem) return

    // Evitar duplicados en el formulario
    if (items.some(it => it.id === selectedItem)) {
      addToast('⚠️ Este artículo ya está agregado a la lista')
      return
    }

    const newItem = {
      id: selectedItem,
      name: invItem?.product?.name || invItem?.ingredient?.name,
      ingredientId: invItem?.ingredientId,
      productId: invItem?.productId,
      quantity: parseFloat(quantity)
    }
    setItems([...items, newItem])
    setSelectedItem('')
    setQuantity('')
  }

  const removeItem = (idxToRemove: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== idxToRemove))
  }

  const handleSubmit = async () => {
    if (!toBranchId || items.length === 0) {
      addToast('⚠️ Selecciona una sucursal destino y añade al menos un artículo')
      return
    }
    const token = getToken()
    if (!token) return

    setSubmitting(true)
    try {
      await apiCreateTransfer(token, {
        toBranchId,
        notes,
        items
      })
      addToast('✅ Transferencia creada y enviada con éxito')
      setShowModal(false)
      setItems([])
      setNotes('')
      setToBranchId('')
      loadData()
    } catch (e: any) {
      addToast(`❌ Error: ${e.message || 'No se pudo crear la transferencia'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    const token = getToken()
    if (!token) return
    try {
      await apiUpdateTransferStatus(token, id, status)
      addToast(`⚡ Estado de transferencia actualizado a "${status}"`)
      loadData()
    } catch (e: any) {
      addToast(`❌ Error al actualizar estado: ${e.message || 'Error de comunicación'}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'inherit', padding: '40px', position: 'relative' }}>
      
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: 0, right: '15%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(34,197,94,0.02) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      {/* Toast Messages Overlay */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map((toast, i) => (
          <div key={i} className="glass" style={{
            padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #22c55e',
            color: '#fff', fontSize: '13px', fontWeight: 600, animation: 'fadeIn 0.2s ease',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', minWidth: '280px'
          }}>
            {toast}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0 }}>
              📦 Transferencias entre Sucursales
            </h1>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Mueve ingredientes e insumos de forma segura entre sucursales autorizadas.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowModal(true)} className="btn-green" style={{ padding: '12px 20px', fontWeight: 700 }}>
              ➕ Nueva Transferencia
            </button>
            <a href="/inventory" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📦 Volver al Inventario
            </a>
          </div>
        </div>

        {/* Transfers Deck List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--c-text-muted)' }}>
              <div className="animate-pulse">Cargando bitácora de transferencias...</div>
            </div>
          ) : transfers.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--c-text-muted)', background: 'var(--c-surface-1)', borderRadius: '20px', border: '1px dashed var(--c-border)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📦</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No hay transferencias registradas en esta sucursal.</div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>Crea una nueva transferencia arriba para mover stock.</div>
            </div>
          ) : transfers.map(t => {
            const isReceived = t.status === 'RECEIVED'
            const isInTransit = t.status === 'IN_TRANSIT'
            return (
              <div key={t.id} className="glass" style={{ border: '1px solid var(--c-border)', borderRadius: '16px', padding: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>{t.fromBranch?.name || 'Local'}</span>
                      <span style={{ color: 'var(--c-green)', fontWeight: 900 }}>➔</span>
                      <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--c-green)' }}>{t.toBranch?.name || 'Destino'}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', fontFamily: 'monospace' }}>
                      ID: {t.id} · 📅 {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <span style={{ 
                    fontSize: '10px', padding: '4px 10px', borderRadius: '12px', fontWeight: 800,
                    background: isReceived ? 'rgba(34,197,94,0.12)' : isInTransit ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                    color: isReceived ? '#4ade80' : isInTransit ? '#60a5fa' : '#fbbf24',
                    border: isReceived ? '1px solid rgba(34,197,94,0.2)' : isInTransit ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(245,158,11,0.2)',
                    letterSpacing: '0.05em'
                  }}>
                    {t.status}
                  </span>
                </div>

                {t.notes && (
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--c-text-muted)', marginBottom: '14px', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '8px' }}>
                    📝 "{t.notes}"
                  </div>
                )}

                {/* Items List */}
                <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', padding: '16px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Items Transferidos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {t.items.map((item: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--c-text-secondary)' }}>
                          📦 {item.ingredient?.name || item.product?.name || `Artículo (ID: ${item.ingredientId || item.productId})`}
                        </span>
                        <span style={{ fontWeight: 800, color: '#fff' }}>
                          x{item.quantity} {item.ingredient?.unit || 'uds'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Control Actions */}
                {t.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => updateStatus(t.id, 'IN_TRANSIT')} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 16px', fontWeight: 700 }}>
                      🚚 Marcar En Tránsito
                    </button>
                    <button onClick={() => updateStatus(t.id, 'RECEIVED')} className="btn-green" style={{ fontSize: '11px', padding: '8px 16px', fontWeight: 700 }}>
                      📥 Confirmar Recibido
                    </button>
                  </div>
                )}
                {t.status === 'IN_TRANSIT' && (
                  <button onClick={() => updateStatus(t.id, 'RECEIVED')} className="btn-green" style={{ fontSize: '11px', padding: '8px 16px', fontWeight: 700 }}>
                    📥 Confirmar Recepción
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* New Transfer Modal */}
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease'
          }} onClick={() => !submitting && setShowModal(false)}>
            
            <div className="glass" style={{
              width: '600px', borderRadius: 'var(--r-xl)', padding: '32px',
              border: '1px solid var(--c-border)', animation: 'fadeIn 0.2s ease'
            }} onClick={e => e.stopPropagation()}>
              
              <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '24px', color: '#fff', letterSpacing: '-0.02em' }}>
                📦 Nueva Transferencia
              </h2>
              
              {/* Destination Branch */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  SUCURSAL DESTINO
                </label>
                <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className="input-dark" style={{ width: '100%', padding: '12px' }}>
                  <option value="">Seleccionar destino...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Add items panel */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--c-border)' }}>
                <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '10px', fontWeight: 700 }}>
                  AÑADIR ARTÍCULOS DE INVENTARIO
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="input-dark" style={{ flex: 2, padding: '12px' }}>
                    <option value="">Buscar item...</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.product?.name || i.ingredient?.name} (Stock: {i.quantity.toFixed(1)})
                      </option>
                    ))}
                  </select>
                  <input type="number" placeholder="Cant" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-dark" style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 700 }} />
                  <button onClick={addItem} className="btn-green" style={{ padding: '0 18px', fontWeight: 800 }}>➕</button>
                </div>

                {/* Items to transfer list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--c-text-secondary)', fontWeight: 600 }}>{it.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--c-green)' }}>x{it.quantity}</span>
                        <button onClick={() => removeItem(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: 0 }} title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '11px', padding: '10px 0' }}>
                      Ningún artículo agregado a la transferencia.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  NOTAS DE TRANSFERENCIA
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Recarga semanal, ingredientes de apoyo..." className="input-dark" style={{ width: '100%', padding: '12px', minHeight: '80px', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, padding: '14px', fontWeight: 700 }} disabled={submitting}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="btn-green" style={{ flex: 1, padding: '14px', fontWeight: 700 }} disabled={submitting || !toBranchId || items.length === 0}>
                  {submitting ? 'Enviando...' : 'Enviar Transferencia'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

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
  
  // New transfer form
  const [toBranchId, setToBranchId] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<any[]>([])

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [router])

  const addItem = () => {
    if (!selectedItem || !quantity) return
    const invItem = inventory.find(i => i.id === selectedItem)
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

  const handleSubmit = async () => {
    if (!toBranchId || items.length === 0) return
    const token = getToken()
    if (!token) return
    try {
      await apiCreateTransfer(token, {
        toBranchId,
        notes,
        items
      })
      alert('Transferencia creada con éxito')
      setShowModal(false)
      setItems([])
      setNotes('')
      setToBranchId('')
      loadData()
    } catch (e) {
      alert('Error al crear transferencia')
    }
  }

  const updateStatus = async (id: string, status: string) => {
    const token = getToken()
    if (!token) return
    try {
      await apiUpdateTransferStatus(token, id, status)
      loadData()
    } catch (e) {
      alert('Error al actualizar estado')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit', padding: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--c-text)' }}>Transferencias entre Sucursales</h1>
            <p style={{ color: 'var(--c-text-muted)' }}>Mueve inventario de forma segura</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowModal(true)} className="btn-green">➕ Nueva Transferencia</button>
            <a href="/inventory" className="btn-ghost" style={{ textDecoration: 'none' }}>📦 Volver al Inventario</a>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)' }}>Cargando...</div>
          ) : transfers.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--c-text-muted)', background: 'var(--c-surface-1)', borderRadius: '20px', border: '1px dashed var(--c-border)' }}>
              No hay transferencias registradas.
            </div>
          ) : transfers.map(t => (
            <div key={t.id} style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{t.fromBranch.name}</span>
                    <span style={{ color: 'var(--c-text-muted)' }}>➔</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--c-green)' }}>{t.toBranch.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
                    ID: {t.id} · {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <span style={{ 
                  fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 700,
                  background: t.status === 'RECEIVED' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: t.status === 'RECEIVED' ? '#22c55e' : '#f59e0b'
                }}>
                  {t.status}
                </span>
              </div>

              <div style={{ background: 'var(--c-surface-2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                {t.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '13px', padding: '4px 0', borderBottom: idx < t.items.length -1 ? '1px solid var(--c-border)' : 'none' }}>
                    • {item.quantity} unidades de {item.ingredientId ? 'Ingrediente' : 'Producto'} (ID: {item.ingredientId || item.productId})
                  </div>
                ))}
              </div>

              {t.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => updateStatus(t.id, 'IN_TRANSIT')} className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }}>Marcar En Tránsito</button>
                  <button onClick={() => updateStatus(t.id, 'RECEIVED')} className="btn-green" style={{ fontSize: '12px', padding: '6px 12px' }}>Marcar como Recibido</button>
                </div>
              )}
              {t.status === 'IN_TRANSIT' && (
                <button onClick={() => updateStatus(t.id, 'RECEIVED')} className="btn-green" style={{ fontSize: '12px', padding: '6px 12px' }}>Confirmar Recepción</button>
              )}
            </div>
          ))}
        </div>

        {/* New Transfer Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Nueva Transferencia</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px' }}>Sucursal Destino</label>
                <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className="input-dark" style={{ width: '100%', padding: '10px' }}>
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div style={{ background: 'var(--c-surface-2)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px' }}>Agregar Items</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="input-dark" style={{ flex: 2, padding: '10px' }}>
                    <option value="">Item...</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>{i.product?.name || i.ingredient?.name} ({i.quantity.toFixed(1)})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Cant" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-dark" style={{ flex: 1, padding: '10px' }} />
                  <button onClick={addItem} className="btn-green" style={{ padding: '0 16px' }}>➕</button>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--c-border)', fontSize: '13px' }}>
                      <span>{it.name}</span>
                      <span style={{ fontWeight: 700 }}>x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px' }}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-dark" style={{ width: '100%', padding: '10px', minHeight: '80px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, padding: '12px' }}>Cancelar</button>
                <button onClick={handleSubmit} className="btn-green" style={{ flex: 1, padding: '12px' }} disabled={!toBranchId || items.length === 0}>Enviar Transferencia</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

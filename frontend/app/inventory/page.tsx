// frontend/app/inventory/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, apiGetInventory, apiAdjustInventory, type InventoryItem } from '@/lib/api'

export default function InventoryPage() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading]     = useState(true)

  // Search & Filtering States
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'ALL' | 'PRODUCTS' | 'INGREDIENTS' | 'CRITICAL'>('ALL')

  // Adjustment States
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty]   = useState('')
  const [adjustReason, setAdjustReason] = useState('Recarga de Insumos 🌿')
  const [submitting, setSubmitting] = useState(false)

  // Custom Toast State
  const [toasts, setToasts] = useState<string[]>([])
  const addToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 4000)
  }

  const loadInventory = async () => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    try {
      const data = await apiGetInventory(token)
      setInventory(data)
    } catch (e) {
      console.error(e)
      addToast('❌ Error al cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [router])

  // Save Inventory Adjustment
  const handleSaveAdjustment = async () => {
    if (!adjustItem || !adjustQty || isNaN(Number(adjustQty))) {
      addToast('⚠️ Ingresa una cantidad válida')
      return
    }
    const token = getToken()
    if (!token) return

    setSubmitting(true)
    try {
      const isProduct = !!adjustItem.productId
      const payload: any = {
        quantity: parseFloat(adjustQty),
        reason: adjustReason
      }
      if (isProduct) {
        payload.productId = adjustItem.productId
      } else {
        payload.ingredientId = adjustItem.ingredientId
      }

      await apiAdjustInventory(token, payload)
      addToast(`✅ Stock de "${adjustItem.product?.name || adjustItem.ingredient?.name}" ajustado correctamente`)
      setAdjustItem(null)
      setAdjustQty('')
      loadInventory()
    } catch (err: any) {
      addToast(`❌ Error: ${err.message || 'No se pudo ajustar stock'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Inventory Lists
  const filteredInventory = inventory.filter(item => {
    const name = (item.product?.name || item.ingredient?.name || '').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'PRODUCTS') return !!item.product
    if (filter === 'INGREDIENTS') return !!item.ingredient
    if (filter === 'CRITICAL') return item.quantity <= item.minStock

    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'inherit', padding: '40px', position: 'relative' }}>
      
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: 0, left: '25%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(34,197,94,0.03) 0%, rgba(0,0,0,0) 70%)',
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0 }}>
              🌿 Inventario y Costeo Inteligente
            </h1>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Monitoreo operativo de ingredientes y stock de sucursal en tiempo real.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/inventory/transfers" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-green)', borderColor: 'rgba(34,197,94,0.2)' }}>
              📦 Transferencias
            </a>
            <a href="/pos" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💳 Volver al POS
            </a>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--c-surface-1)', padding: '6px', borderRadius: '12px', border: '1px solid var(--c-border)' }}>
            {(['ALL', 'PRODUCTS', 'INGREDIENTS', 'CRITICAL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  background: filter === tab ? 'var(--c-green)' : 'transparent',
                  color: filter === tab ? '#000' : 'var(--c-text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                  textTransform: 'uppercase', letterSpacing: '0.02em'
                }}
              >
                {tab === 'ALL' && '✨ Todos'}
                {tab === 'PRODUCTS' && '🥤 Productos'}
                {tab === 'INGREDIENTS' && '🌿 Insumos'}
                {tab === 'CRITICAL' && '⚠️ Stock Bajo'}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar artículo en inventario..."
            className="input-dark"
            style={{ width: '320px', padding: '12px 16px', fontSize: '13px' }}
          />
        </div>

        {/* Inventory Deck Card */}
        <div className="glass" style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '1px solid var(--c-border)' }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '14px' }}>
              <div className="animate-pulse">Cargando inventario de sucursal...</div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--c-text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🌿</div>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Ningún artículo coincide con los filtros.</div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>El inventario se debita atómicamente en cada checkout del POS.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--c-border)' }}>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artículo</th>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Inventario</th>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Actual</th>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mínimo Crítico</th>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                  <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item, idx) => {
                  const isLow = item.quantity <= item.minStock
                  return (
                    <tr key={item.id} style={{
                      borderBottom: idx < filteredInventory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isLow ? 'rgba(239,68,68,0.01)' : 'transparent',
                      transition: 'background 0.2s ease'
                    }} className="hover-row">
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{item.product ? '🥤' : '🌿'}</span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                              {item.product?.name || item.ingredient?.name || 'Desconocido'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                              ID: {item.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '18px 24px', fontSize: '13px', color: 'var(--c-text-muted)', fontWeight: 500 }}>
                        {item.product ? 'Producto Directo' : `Ingrediente (${item.ingredient?.unit || 'uds'})`}
                      </td>
                      <td style={{ padding: '18px 24px', fontSize: '15px', fontWeight: 900, color: isLow ? '#ef4444' : 'var(--c-green)' }}>
                        {item.quantity.toFixed(2)} <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--c-text-muted)' }}>{item.ingredient?.unit || 'uds'}</span>
                      </td>
                      <td style={{ padding: '18px 24px', fontSize: '13px', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                        {item.minStock}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{ 
                          fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 800,
                          background: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                          color: isLow ? '#f87171' : '#4ade80',
                          border: isLow ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.2)',
                          letterSpacing: '0.05em'
                        }}>
                          {isLow ? '⚠️ STOCK BAJO' : '✅ ÓPTIMO'}
                        </span>
                      </td>
                      <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="btn-ghost"
                          style={{
                            padding: '6px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '8px',
                            borderColor: 'rgba(255,255,255,0.1)', cursor: 'pointer'
                          }}
                        >
                          🔧 Ajustar Stock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Adjust Stock Inline Modal */}
      {adjustItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease'
        }} onClick={() => setAdjustItem(null)}>
          
          <div className="glass" style={{
            width: '420px', borderRadius: 'var(--r-xl)', padding: '32px',
            border: '1px solid var(--c-border)', animation: 'fadeIn 0.2s ease'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '24px' }}>🔧</span>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>Ajustar Inventario</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '24px' }}>
              {adjustItem.product?.name || adjustItem.ingredient?.name}
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>
                <span>Stock Actual</span>
                <span>Mínimo Crítico</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900 }}>
                <span style={{ color: 'var(--c-green)' }}>{adjustItem.quantity.toFixed(2)} {adjustItem.ingredient?.unit || 'uds'}</span>
                <span>{adjustItem.minStock} {adjustItem.ingredient?.unit || 'uds'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  NUEVA CANTIDAD EN STOCK ({adjustItem.ingredient?.unit || 'uds'})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="input-dark"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  MOTIVO DEL AJUSTE
                </label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="input-dark"
                  style={{ width: '100%', padding: '12px', fontSize: '13px' }}
                >
                  <option value="Recarga de Insumos 🌿">Recarga de Insumos 🌿</option>
                  <option value="Merma / Desperdicio 🗑️">Merma / Desperdicio 🗑️</option>
                  <option value="Auditoría / Ajuste Físico 📊">Auditoría / Ajuste Físico 📊</option>
                  <option value="Caducidad / Daño 💔">Caducidad / Daño 💔</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setAdjustItem(null)}
                className="btn-ghost"
                style={{ flex: 1, padding: '14px', fontWeight: 700 }}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="btn-green"
                style={{ flex: 1, padding: '14px', fontWeight: 700 }}
                disabled={submitting || !adjustQty}
              >
                {submitting ? 'Guardando...' : 'Guardar Ajuste'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

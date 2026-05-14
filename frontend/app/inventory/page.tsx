'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, apiGetInventory, type InventoryItem } from '@/lib/api'

export default function InventoryPage() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    apiGetInventory(token)
      .then(setInventory)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--c-text)' }}>Inventario y Costeo Inteligente</h1>
            <p style={{ color: 'var(--c-text-muted)' }}>Gestión de stock en tiempo real</p>
          </div>
          <a href="/pos" className="btn-ghost" style={{ textDecoration: 'none' }}>💳 Volver al POS</a>
        </div>

        <div style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)' }}>Cargando inventario...</div>
          ) : inventory.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)' }}>
              No hay movimientos de inventario registrados. El inventario se descontará automáticamente al vender productos.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-border)' }}>
                  <th style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>Item</th>
                  <th style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>Tipo</th>
                  <th style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>Stock Actual</th>
                  <th style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>Stock Mínimo</th>
                  <th style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => {
                  const isLow = item.quantity <= item.minStock
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
                        {item.product?.name || item.ingredient?.name || 'Desconocido'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>
                        {item.product ? 'Producto Directo' : `Ingrediente (${item.ingredient?.unit})`}
                      </td>
                      <td style={{ padding: '16px', fontSize: '15px', fontWeight: 700, color: isLow ? '#ef4444' : 'var(--c-text)' }}>
                        {item.quantity.toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: 'var(--c-text-muted)' }}>
                        {item.minStock}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          fontSize: '11px', padding: '4px 8px', borderRadius: '12px', fontWeight: 600,
                          background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: isLow ? '#ef4444' : '#22c55e'
                        }}>
                          {isLow ? 'CRÍTICO' : 'ÓPTIMO'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

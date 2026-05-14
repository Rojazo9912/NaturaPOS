'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken,
  apiGetProducts,
  apiGetCategories,
  apiGetIngredients,
  apiCreateProduct,
  apiUpdateProduct,
  apiCreateIngredient,
  apiUpsertRecipe,
  apiGetRecipe,
  apiGetAuditLogs,
  apiGetRiskAlerts,
  apiResolveRiskAlert,
  apiGetSubscriptionPlans,
  apiCreateSubscriptionPlan,
  apiGetUsers,
  apiGetBranches,
  apiCreateUser,
  apiUpdateUser,
  apiAdjustInventory,
  type Product,
  type Category,
  type Ingredient
} from '@/lib/api'
import { getSocket, disconnectSocket } from '@/lib/socket'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'INGREDIENTS' | 'RECIPES' | 'SECURITY' | 'SUBSCRIPTIONS' | 'USERS'>('PRODUCTS')
  
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // Load Data
  const loadData = async () => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    setLoading(true)
    try {
      const [prods, cats, ings] = await Promise.all([
        apiGetProducts(token),
        apiGetCategories(token),
        apiGetIngredients(token),
      ])
      setProducts(prods)
      setCategories(cats)
      setIngredients(ings)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadData() 
    
    // Real-time alerts
    const token = getToken()
    if (token) {
      // In a real app we'd decode token to get orgId, but for now we join from backend or use a generic room
      const socket = getSocket() // Joining org logic is in backend join_org message
      socket.on('risk_alert', (alert) => {
        alert('🚨 NUEVA ALERTA DE RIESGO DETECTADA')
        if (activeTab === 'SECURITY') loadData()
      })
    }
    return () => { disconnectSocket() }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: 'var(--c-surface-1)', borderBottom: '1px solid var(--c-border)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--c-text)' }}>Panel de Administración</h1>
          <p style={{ color: 'var(--c-text-muted)' }}>Gestión de Catálogo, Recetas e Insumos</p>
        </div>
        <a href="/pos" className="btn-ghost" style={{ textDecoration: 'none' }}>💳 Volver al POS</a>
      </div>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--c-border)', paddingBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button onClick={() => setActiveTab('PRODUCTS')} className={activeTab === 'PRODUCTS' ? 'btn-green' : 'btn-ghost'}>📦 Productos</button>
          <button onClick={() => setActiveTab('INGREDIENTS')} className={activeTab === 'INGREDIENTS' ? 'btn-green' : 'btn-ghost'}>🌾 Insumos Base</button>
          <button onClick={() => setActiveTab('RECIPES')} className={activeTab === 'RECIPES' ? 'btn-green' : 'btn-ghost'}>🧪 Recetas</button>
          <button onClick={() => setActiveTab('SUBSCRIPTIONS')} className={activeTab === 'SUBSCRIPTIONS' ? 'btn-green' : 'btn-ghost'}>⭐ Planes de Suscripción</button>
          <button onClick={() => setActiveTab('USERS')} className={activeTab === 'USERS' ? 'btn-green' : 'btn-ghost'}>👥 Usuarios</button>
          <button onClick={() => setActiveTab('SECURITY')} className={activeTab === 'SECURITY' ? 'btn-green' : 'btn-ghost'} style={{ marginLeft: 'auto', border: '1px solid #ef444450' }}>🛡️ Auditoría Antifugas</button>
        </div>

        {loading && activeTab !== 'USERS' && activeTab !== 'SECURITY' && activeTab !== 'SUBSCRIPTIONS' ? (
          <div>Cargando datos...</div>
        ) : (
          <div>
            {activeTab === 'PRODUCTS' && <AdminProducts products={products} categories={categories} onReload={loadData} />}
            {activeTab === 'INGREDIENTS' && <AdminIngredients ingredients={ingredients} onReload={loadData} />}
            {activeTab === 'RECIPES' && <AdminRecipes products={products} ingredients={ingredients} />}
            {activeTab === 'SUBSCRIPTIONS' && <AdminSubscriptions />}
            {activeTab === 'USERS' && <AdminUsers />}
            {activeTab === 'SECURITY' && <AdminSecurity />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── PRODUCTS TAB ───────────────────────────────────────────────────────────
function AdminProducts({ products, categories, onReload }: { products: Product[], categories: Category[], onReload: () => void }) {
  const [form, setForm] = useState({ name: '', price: '', categoryId: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateProduct(token, {
        name: form.name,
        price: Number(form.price),
        categoryId: form.categoryId || undefined,
        description: form.description,
      })
      setForm({ name: '', price: '', categoryId: '', description: '' })
      onReload()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Nuevo Producto</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="input-dark" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
          <input className="input-dark" type="number" placeholder="Precio ($)" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required />
          <select className="input-dark" value={form.categoryId} onChange={e=>setForm({...form, categoryId: e.target.value})}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <textarea className="input-dark" placeholder="Descripción" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
          <button type="submit" disabled={submitting} className="btn-green">Crear Producto</button>
        </form>
      </div>

      <div style={{ background: 'var(--c-surface-1)', borderRadius: '16px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--c-surface-2)' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: '13px' }}>Nombre</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Categoría</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Precio</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '16px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '16px', color: 'var(--c-text-muted)' }}>{p.category?.name || '-'}</td>
                <td style={{ padding: '16px', color: 'var(--c-green)' }}>${p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── ADJUST STOCK CELL ──────────────────────────────────────────────────────
function AdjustStockCell({ ingredientId, onDone }: { ingredientId: string; onDone: () => void }) {
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)

  const handleAdjust = async () => {
    const token = getToken()
    if (!token || qty === '' || qty === '0') return
    setBusy(true)
    try {
      await apiAdjustInventory(token, { ingredientId, quantity: Number(qty), reason: 'Ajuste manual admin' })
      setQty('')
      onDone()
    } catch { /* ignore */ } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input
        type="number"
        value={qty}
        onChange={e => setQty(e.target.value)}
        placeholder="±qty"
        style={{ width: '64px', padding: '4px 8px', fontSize: '12px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: '6px', color: 'var(--c-text)' }}
      />
      <button onClick={handleAdjust} disabled={busy || qty === ''} className="btn-green" style={{ padding: '4px 10px', fontSize: '11px' }}>
        {busy ? '...' : '✓'}
      </button>
    </div>
  )
}

// ── INGREDIENTS TAB ────────────────────────────────────────────────────────
function AdminIngredients({ ingredients, onReload }: { ingredients: Ingredient[], onReload: () => void }) {
  const [form, setForm] = useState({ name: '', unit: 'GRAM', costPerUnit: '', minStock: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateIngredient(token, {
        name: form.name,
        unit: form.unit,
        costPerUnit: Number(form.costPerUnit),
        minStock: Number(form.minStock),
      })
      setForm({ name: '', unit: 'GRAM', costPerUnit: '', minStock: '' })
      onReload()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Nuevo Insumo Base</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="input-dark" placeholder="Nombre (ej. Proteína Whey)" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
          <select className="input-dark" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})}>
            <option value="GRAM">Gramos (g)</option>
            <option value="MILLILITER">Mililitros (ml)</option>
            <option value="UNIT">Unidad (pza)</option>
          </select>
          <input className="input-dark" type="number" step="0.01" placeholder="Costo por unidad ($)" value={form.costPerUnit} onChange={e=>setForm({...form, costPerUnit: e.target.value})} required />
          <input className="input-dark" type="number" placeholder="Stock mínimo alerta" value={form.minStock} onChange={e=>setForm({...form, minStock: e.target.value})} required />
          <button type="submit" disabled={submitting} className="btn-green">Crear Insumo</button>
        </form>
      </div>

      <div style={{ background: 'var(--c-surface-1)', borderRadius: '16px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--c-surface-2)' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: '13px' }}>Insumo</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Unidad</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Costo/Unidad</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Stock Actual</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Mínimo</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '16px', fontWeight: 600 }}>{i.name}</td>
                <td style={{ padding: '16px', color: 'var(--c-text-muted)' }}>{i.unit}</td>
                <td style={{ padding: '16px' }}>${i.costPerUnit}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    fontWeight: 800, 
                    color: (i.stock || 0) <= (i.minStock || 0) ? '#ef4444' : 'var(--c-green)'
                  }}>
                    {i.stock ?? 0}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--c-text-muted)' }}>{i.minStock}</td>
                <td style={{ padding: '16px' }}>
                  <AdjustStockCell ingredientId={i.id} onDone={onReload} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── RECIPES TAB ────────────────────────────────────────────────────────────
function AdminRecipes({ products, ingredients }: { products: Product[], ingredients: Ingredient[] }) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [recipeItems, setRecipeItems] = useState<{ingredientId: string, quantity: number}[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load recipe when product changes
  useEffect(() => {
    if (!selectedProduct) {
      setRecipeItems([]); return
    }
    const token = getToken()
    if (!token) return
    setLoadingRecipe(true)
    apiGetRecipe(token, selectedProduct).then(res => {
      if (res && res.items) {
        setRecipeItems(res.items.map((i: any) => ({ ingredientId: i.ingredientId, quantity: i.quantity })))
      } else {
        setRecipeItems([])
      }
    }).catch(console.error).finally(() => setLoadingRecipe(false))
  }, [selectedProduct])

  const handleAddItem = () => {
    if (ingredients.length === 0) return
    setRecipeItems([...recipeItems, { ingredientId: ingredients[0].id, quantity: 1 }])
  }

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...recipeItems]
    newItems[index] = { ...newItems[index], [field]: field === 'quantity' ? Number(value) : value }
    setRecipeItems(newItems)
  }

  const handleSave = async () => {
    const token = getToken()
    if (!token || !selectedProduct) return
    setSaving(true)
    try {
      // Find units from ingredients array to pass to the backend
      const itemsToSave = recipeItems.map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId)
        return { ingredientId: ri.ingredientId, quantity: ri.quantity, unit: ing?.unit || 'GRAM' }
      })

      await apiUpsertRecipe(token, selectedProduct, { yieldQty: 1, items: itemsToSave })
      alert('Receta guardada exitosamente')
    } catch (e) {
      console.error(e)
      alert('Error guardando receta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--c-surface-1)', padding: '32px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--c-text-muted)' }}>Selecciona un Producto para editar su Receta</label>
        <select className="input-dark" value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} style={{ width: '300px', fontSize: '16px', padding: '12px' }}>
          <option value="">-- Seleccionar --</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProduct && (
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Ingredientes de la Receta</h3>
          
          {loadingRecipe ? <div>Cargando receta...</div> : (
            <div>
              {recipeItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
                  <select className="input-dark" value={item.ingredientId} onChange={e=>handleItemChange(idx, 'ingredientId', e.target.value)} style={{ flex: 1 }}>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
                  <input type="number" step="0.1" className="input-dark" value={item.quantity} onChange={e=>handleItemChange(idx, 'quantity', e.target.value)} style={{ width: '120px' }} />
                  <button onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>
              ))}
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <button onClick={handleAddItem} className="btn-ghost" style={{ border: '1px dashed var(--c-border)' }}>+ Agregar Insumo</button>
                <button onClick={handleSave} disabled={saving} className="btn-green">
                  {saving ? 'Guardando...' : '💾 Guardar Receta Completa'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SECURITY TAB ───────────────────────────────────────────────────────────
function AdminSecurity() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadSecurityData = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const [al, lg] = await Promise.all([
        apiGetRiskAlerts(token),
        apiGetAuditLogs(token)
      ])
      setAlerts(al)
      setLogs(lg)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSecurityData() }, [])

  const resolveAlert = async (id: string) => {
    const token = getToken()
    if (!token) return
    try {
      await apiResolveRiskAlert(token, id)
      loadSecurityData()
    } catch (e) {
      alert('Error resolviendo alerta')
    }
  }

  if (loading) return <div>Cargando reportes de seguridad...</div>

  const activeAlerts = alerts.filter(a => !a.isResolved)
  const pastAlerts = alerts.filter(a => a.isResolved)

  return (
    <div className="admin-split">
      {/* Risk Alerts */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#ef4444' }}>🚨 Alertas de Riesgo Activas ({activeAlerts.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {activeAlerts.length === 0 && <div style={{ color: 'var(--c-text-muted)' }}>No hay alertas activas.</div>}
          {activeAlerts.map(a => (
            <div key={a.id} style={{ background: '#ef444410', border: '1px solid #ef444450', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>{a.type} ({a.severity})</span>
                <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '12px' }}>{a.description}</p>
              <button onClick={() => resolveAlert(a.id)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--c-text)' }}>✔️ Marcar como resuelto</button>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--c-text-muted)' }}>Alertas Pasadas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pastAlerts.map(a => (
            <div key={a.id} style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', padding: '12px', borderRadius: '8px', opacity: 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{a.type}</span>
                <span style={{ fontSize: '11px' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>{a.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>📜 Registro de Auditoría (Audit Log)</h3>
        <div style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: 'var(--c-surface-2)' }}>
              <tr>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Usuario</th>
                <th style={{ padding: '12px' }}>Acción</th>
                <th style={{ padding: '12px' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '12px', color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{l.user?.name}</td>
                  <td style={{ padding: '12px', color: '#f59e0b', fontWeight: 600 }}>{l.action}</td>
                  <td style={{ padding: '12px', color: 'var(--c-text-muted)', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(l.details)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-muted)' }}>No hay registros recientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── SUBSCRIPTIONS TAB ──────────────────────────────────────────────────────
function AdminSubscriptions() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '', price: '', intervalDays: '30', smoothiesQty: '', discountPct: '0' })
  const [submitting, setSubmitting] = useState(false)

  const loadPlans = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await apiGetSubscriptionPlans(token)
      setPlans(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlans() }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateSubscriptionPlan(token, {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        intervalDays: parseInt(form.intervalDays),
        smoothiesQty: form.smoothiesQty ? parseInt(form.smoothiesQty) : null,
        discountPct: parseFloat(form.discountPct),
      })
      alert('Plan de suscripción creado con éxito')
      setForm({ name: '', description: '', price: '', intervalDays: '30', smoothiesQty: '', discountPct: '0' })
      loadPlans()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Cargando planes...</div>

  return (
    <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Nuevo Plan de Suscripción</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input required placeholder="Nombre (ej. Plan Recovery Elite)" className="input-dark" style={{ padding: '10px' }} value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <textarea placeholder="Descripción / Beneficios" className="input-dark" style={{ padding: '10px', minHeight: '60px' }} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
          <input required type="number" step="0.01" placeholder="Precio ($)" className="input-dark" style={{ padding: '10px' }} value={form.price} onChange={e=>setForm({...form, price: e.target.value})} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>Frecuencia (Días)</label>
              <input required type="number" placeholder="Ej. 30" className="input-dark" style={{ padding: '10px', width: '100%' }} value={form.intervalDays} onChange={e=>setForm({...form, intervalDays: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>Smoothies Incluidos</label>
              <input type="number" placeholder="Opcional" className="input-dark" style={{ padding: '10px', width: '100%' }} value={form.smoothiesQty} onChange={e=>setForm({...form, smoothiesQty: e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>Descuento Fijo en POS (%)</label>
            <input required type="number" step="0.1" placeholder="Ej. 10" className="input-dark" style={{ padding: '10px', width: '100%' }} value={form.discountPct} onChange={e=>setForm({...form, discountPct: e.target.value})} />
          </div>
          <button type="submit" disabled={submitting} className="btn-green" style={{ padding: '12px', marginTop: '8px' }}>
            {submitting ? 'Creando...' : 'Crear Plan'}
          </button>
        </form>
      </div>

      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Planes Activos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: 'var(--c-surface-1)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--c-green)' }}>{p.name}</h4>
                <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)', marginTop: '4px' }}>{p.description}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--c-text-muted)' }}>
                  <span>🔄 Cada {p.intervalDays} días</span>
                  {p.smoothiesQty > 0 && <span>🥤 {p.smoothiesQty} Smoothies</span>}
                  {p.discountPct > 0 && <span>🏷️ {p.discountPct}% OFF extra</span>}
                </div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>${p.price}</div>
            </div>
          ))}
          {plans.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--c-text-muted)', border: '1px dashed var(--c-border)', borderRadius: '12px' }}>
              No hay planes de suscripción configurados.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// ── USERS TAB ───────────────────────────────────────────────────────────
const ROLE_INFO: Record<string, { label: string, color: string, can: string[], cannot: string[] }> = {
  CASHIER: {
    label: 'Cajero',
    color: '#22c55e',
    can: ['Cobrar en POS', 'Ver inventario sucursal', 'Realizar corte de caja'],
    cannot: ['Ver métricas globales', 'Editar productos', 'Gestionar otros usuarios'],
  },
  SUPERVISOR: {
    label: 'Supervisor',
    color: '#3b82f6',
    can: ['Ver todos los cortes de caja', 'Autorizar descuentos manuales', 'Gestionar inventario'],
    cannot: ['Configuración global del sistema', 'Ver métricas de franquicia'],
  },
  REGIONAL_MANAGER: {
    label: 'Gerente Regional',
    color: '#8b5cf6',
    can: ['Ver métricas de múltiples sucursales', 'Gestionar transferencias', 'Auditar inventarios'],
    cannot: ['Editar recetas core', 'Modificar planes de suscripción'],
  },
  ADMIN: {
    label: 'Administrador',
    color: '#f59e0b',
    can: ['Gestión total de catálogo', 'Configurar recetas', 'Crear usuarios', 'Ver auditoría'],
    cannot: ['Ver métricas de Modo Franquicia (solo Owner)'],
  },
  OWNER: {
    label: 'Dueño / CEO',
    color: '#ef4444',
    can: ['Acceso absoluto al sistema', 'Modo Franquicia', 'Configuración global', 'Métricas avanzadas'],
    cannot: [],
  },
}

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CASHIER', branchId: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const [u, b] = await Promise.all([apiGetUsers(token), apiGetBranches(token)])
      setUsers(u)
      setBranches(b)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateUser(token, form)
      alert('Usuario creado con éxito')
      setForm({ name: '', email: '', password: '', role: 'CASHIER', branchId: '', phone: '' })
      loadUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Cargando usuarios...</div>

  const selectedRole = ROLE_INFO[form.role]

  return (
    <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '20px' }}>Nuevo Usuario</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input required placeholder="Nombre Completo" className="input-dark" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <input required type="email" placeholder="Correo Electrónico" className="input-dark" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
          <input required type="password" placeholder="Contraseña Temporal" className="input-dark" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
          <input placeholder="Teléfono" className="input-dark" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
          
          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '6px', display: 'block' }}>Sucursal Asignada</label>
            <select className="input-dark" value={form.branchId} onChange={e=>setForm({...form, branchId: e.target.value})} style={{ width: '100%' }}>
              <option value="">-- Corporativo / Todas --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '6px', display: 'block' }}>Rol de Usuario</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.keys(ROLE_INFO).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({...form, role: r})}
                  style={{
                    padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    background: form.role === r ? ROLE_INFO[r].color : 'var(--c-surface-2)',
                    color: form.role === r ? '#000' : 'var(--c-text-muted)',
                    border: 'none', transition: 'var(--t-mid)',
                  }}
                >
                  {ROLE_INFO[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Role Info Box */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginTop: '4px', border: '1px solid var(--c-border)' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: selectedRole.color, marginBottom: '8px' }}>Permisos: {selectedRole.label}</h4>
            <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>
              {selectedRole.can.map(c => <div key={c}>✅ {c}</div>)}
            </div>
            {selectedRole.cannot.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', opacity: 0.6 }}>
                {selectedRole.cannot.map(c => <div key={c}>🚫 {c}</div>)}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn-green" style={{ padding: '14px', marginTop: '10px' }}>
            {submitting ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>

      <div style={{ background: 'var(--c-surface-1)', borderRadius: '16px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--c-surface-2)' }}>
            <tr>
              <th style={{ padding: '16px', fontSize: '13px' }}>Usuario</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Rol</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Sucursal</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px',
                    background: `${ROLE_INFO[u.role]?.color || '#555'}20`, color: ROLE_INFO[u.role]?.color || '#aaa'
                  }}>
                    {ROLE_INFO[u.role]?.label || u.role}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '13px' }}>{u.branch?.name || '—'}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '11px', color: u.isActive ? '#22c55e' : '#ef4444' }}>
                    {u.isActive ? '● Activo' : '● Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useRouter } from 'next/navigation'
import {
  getToken, getUser,
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
  apiCreateCategory,
  apiCreateBranch,
  type Product,
  type Category,
  type Ingredient
} from '@/lib/api'
import { getSocket, disconnectSocket } from '@/lib/socket'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'INGREDIENTS' | 'RECIPES' | 'SECURITY' | 'SUBSCRIPTIONS' | 'USERS'>('PRODUCTS')
  
  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Custom Toast State
  const [toasts, setToasts] = useState<string[]>([])
  const addToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 4000)
  }

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
    setMounted(true)
    loadData() 
    
    // Real-time alerts
    const token = getToken()
    if (token) {
      // In a real app we'd decode token to get orgId, but for now we join from backend or use a generic room
      const socket = getSocket() // Joining org logic is in backend join_org message
      socket.on('risk_alert', (riskAlert: any) => {
        console.warn('🚨 NUEVA ALERTA DE RIESGO:', riskAlert)
        if (activeTab === 'SECURITY') loadData()
      })
    }
    return () => { disconnectSocket() }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div className="no-print" style={{ background: 'var(--c-surface-1)', borderBottom: '1px solid var(--c-border)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--c-text)' }}>Panel de Administración</h1>
          <p style={{ color: 'var(--c-text-muted)' }}>Gestión de Catálogo, Recetas e Insumos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/profile" title="Mi Perfil" style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--c-surface-2)', border: '2px solid var(--c-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 800, color: 'var(--c-text)', textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}>
            {mounted ? (getUser()?.name?.charAt(0)?.toUpperCase() ?? '?') : '?'}
          </a>
          <a href="/pos" className="btn-ghost" style={{ textDecoration: 'none' }}>💳 Volver al POS</a>
        </div>
      </div>

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Tabs */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--c-border)', paddingBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button onClick={() => setActiveTab('PRODUCTS')} className={activeTab === 'PRODUCTS' ? 'btn-green' : 'btn-ghost'}>📦 Productos</button>
          <button onClick={() => setActiveTab('CATEGORIES')} className={activeTab === 'CATEGORIES' ? 'btn-green' : 'btn-ghost'}>🏷️ Categorías</button>
          <button onClick={() => setActiveTab('INGREDIENTS')} className={activeTab === 'INGREDIENTS' ? 'btn-green' : 'btn-ghost'}>🌾 Insumos Base</button>
          <button onClick={() => setActiveTab('RECIPES')} className={activeTab === 'RECIPES' ? 'btn-green' : 'btn-ghost'}>🧪 Recetas</button>
          <button onClick={() => setActiveTab('SUBSCRIPTIONS')} className={activeTab === 'SUBSCRIPTIONS' ? 'btn-green' : 'btn-ghost'}>⭐ Planes de Suscripción</button>
          <button onClick={() => setActiveTab('USERS')} className={activeTab === 'USERS' ? 'btn-green' : 'btn-ghost'}>👥 Usuarios</button>
          <button onClick={() => setActiveTab('SECURITY')} className={activeTab === 'SECURITY' ? 'btn-green' : 'btn-ghost'} style={{ marginLeft: 'auto', border: '1px solid #ef444450' }}>🛡️ Auditoría Antifugas</button>
        </div>

        {/* ── BUSINESS INTELLIGENCE QUICK SUMMARY ── */}
        {activeTab === 'PRODUCTS' && (
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px', fontWeight: 800 }}>STOCK CRÍTICO</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>
                {(ingredients || []).filter(i => i.stock <= i.minStock).length} <span style={{ fontSize: '14px', fontWeight: 400 }}>insumos</span>
              </div>
            </div>
            <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px', fontWeight: 800 }}>CATEGORÍA TOP</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--c-green)' }}>
                {(categories || []).length > 0 ? categories[0].name : '—'}
              </div>
            </div>
            <div className="glass" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px', fontWeight: 800 }}>VALOR DE INVENTARIO</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--c-text)' }}>
                ${(ingredients || []).reduce((acc, i) => acc + (i.stock * i.costPerUnit), 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {loading && activeTab !== 'USERS' && activeTab !== 'SECURITY' && activeTab !== 'SUBSCRIPTIONS' ? (
          <div>Cargando datos...</div>
        ) : (
          <div>
            {activeTab === 'PRODUCTS' && <AdminProducts products={products} categories={categories} onReload={loadData} addToast={addToast} />}
            {activeTab === 'CATEGORIES' && <AdminCategories categories={categories} onReload={loadData} addToast={addToast} />}
            {activeTab === 'INGREDIENTS' && <AdminIngredients ingredients={ingredients} onReload={loadData} addToast={addToast} />}
            {activeTab === 'RECIPES' && <AdminRecipes products={products} ingredients={ingredients} addToast={addToast} />}
            {activeTab === 'SUBSCRIPTIONS' && <AdminSubscriptions addToast={addToast} />}
            {activeTab === 'USERS' && <AdminUsers addToast={addToast} />}
            {activeTab === 'SECURITY' && <AdminSecurity addToast={addToast} />}
          </div>
        )}
      </div>

      {/* Toast Messages Overlay */}
      <div className="no-print" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
    </div>
  )
}

// ── CATEGORIES TAB ─────────────────────────────────────────────────────────
function AdminCategories({ categories, onReload, addToast }: { categories: Category[], onReload: () => void, addToast: (msg: string) => void }) {
  const [form, setForm] = useState({ name: '', emoji: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)

  const EMOJI_CATEGORIES = [
    {
      name: 'Salud y Fitness',
      icon: '💪',
      emojis: ['💪', '🧘', '🥦', '🥑', '🍌', '🥬', '🥗', '🍎', '🍋', '🍓', '🥥', '🥚', '🌾', '🌱', '🌿', '🍃', '🍵', '⚡']
    },
    {
      name: 'Comida',
      icon: '🥪',
      emojis: ['🥪', '🌯', '🌮', '🍔', '🍕', '🍟', '🍳', '🍗', '🥩', '🐟', '🍣', '🍜', '🍚', '🥞', '🥐', '🍞', '🧀', '🍄']
    },
    {
      name: 'Bebidas y Postres',
      icon: '🥤',
      emojis: ['🥤', '☕', '🧉', '🍹', '🍷', '🍺', '🥛', '🍦', '🍰', '🍪', '🍩', '🍫', '🍬', '🍯']
    },
    {
      name: 'Frutas y Vegetales',
      icon: '🍎',
      emojis: ['🍇', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍒', '🍓', '🥝', '🍅', '🥑', '🍆', '🥕', '🌽', '🌶️']
    },
    {
      name: 'Otros y General',
      icon: '🏷️',
      emojis: ['📦', '🏷️', '⭐', '🔥', '❤️', '🎉', '🌟', '🛒', '💰', '💼', '👥', '📅', '✨', '🍀']
    }
  ]

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateCategory(token, { name: form.name, emoji: form.emoji || undefined })
      setForm({ name: '', emoji: '' })
      setShowPicker(false)
      addToast('🎉 Categoría creada exitosamente')
      onReload()
    } catch (err: any) {
      addToast(`❌ Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)', height: 'fit-content' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '20px' }}>Nueva Categoría</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input required placeholder="Nombre (ej. Proteínas)" className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Emoji (ej. 💪)" 
                className="input-dark" 
                value={form.emoji} 
                onChange={e => setForm({ ...form, emoji: e.target.value })} 
                maxLength={4} 
                style={{ width: '100%', paddingRight: '40px' }}
                onClick={() => setShowPicker(true)}
              />
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  opacity: showPicker ? 1 : 0.6,
                  transition: 'opacity var(--t-fast)'
                }}
                title="Seleccionar emoji"
              >
                😀
              </button>
            </div>

            {showPicker && (
              <div style={{
                background: 'var(--c-surface-2)',
                border: '1px solid var(--c-border)',
                borderRadius: '12px',
                padding: '12px',
                animation: 'fadeIn var(--t-fast) forwards',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '4px'
              }}>
                {/* Category tabs */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--c-border)',
                  paddingBottom: '8px',
                }}>
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCategory(idx)}
                      title={cat.name}
                      className="emoji-tab-btn"
                      style={{
                        background: activeCategory === idx ? 'var(--c-green-glow)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeCategory === idx ? 'var(--c-green)' : 'var(--c-text-muted)',
                        transition: 'all var(--t-fast)',
                        borderBottom: activeCategory === idx ? '2px solid var(--c-green)' : 'none',
                      }}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Emojis Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '6px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  paddingRight: '2px'
                }}>
                  {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, emoji })
                      }}
                      className="emoji-item-btn"
                      style={{
                        background: form.emoji === emoji ? 'var(--c-green)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '20px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--t-fast)',
                        transform: form.emoji === emoji ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn-green">
            {submitting ? 'Creando...' : '+ Crear Categoría'}
          </button>
        </form>
      </div>

      <div style={{ background: 'var(--c-surface-1)', borderRadius: '16px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        {categories.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '13px' }}>
            🏷️ No hay categorías aún. ¡Crea la primera!
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--c-surface-2)' }}>
              <tr>
                <th style={{ padding: '16px', fontSize: '13px' }}>Emoji</th>
                <th style={{ padding: '16px', fontSize: '13px' }}>Nombre</th>
                <th style={{ padding: '16px', fontSize: '13px' }}>Orden</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td style={{ padding: '16px', fontSize: '22px' }}>{c.emoji ?? '📦'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '16px', color: 'var(--c-text-muted)' }}>{c.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── PRODUCTS TAB ───────────────────────────────────────────────────────────
function AdminProducts({ products, categories, onReload, addToast }: { products: Product[], categories: Category[], onReload: () => void, addToast: (msg: string) => void }) {
  const [form, setForm] = useState({ name: '', price: '', categoryId: '', description: '', barcode: '', allergens: '' })
  const [submitting, setSubmitting] = useState(false)
  
  // State for label printing
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showLabelModal, setShowLabelModal] = useState(false)

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
        barcode: form.barcode || undefined,
        allergens: form.allergens || undefined,
      })
      addToast(`🎉 Producto "${form.name}" creado con éxito`)
      setForm({ name: '', price: '', categoryId: '', description: '', barcode: '', allergens: '' })
      onReload()
    } catch (e: any) {
      addToast(`❌ Error: ${e.message || 'No se pudo crear producto'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-grid">
      <div className="no-print" style={{ display: 'contents' }}>
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
          <input className="input-dark" placeholder="Código de Barras (Opcional)" value={form.barcode} onChange={e=>setForm({...form, barcode: e.target.value})} />
          <input className="input-dark" placeholder="Alérgenos (ej. Lactosa, Cacahuate)" value={form.allergens} onChange={e=>setForm({...form, allergens: e.target.value})} />
          <button type="submit" disabled={submitting} className="btn-green">Crear Producto</button>
        </form>
      </div>

      <div style={{ background: 'var(--c-surface-1)', borderRadius: '16px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--c-surface-2)' }}>
            <tr>
              <th style={{ padding: '16px', width: '40px' }}>
                <input 
                  type="checkbox"
                  checked={products.length > 0 && selectedProductIds.length === products.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProductIds(products.map(p => p.id))
                    } else {
                      setSelectedProductIds([])
                    }
                  }}
                  style={{ accentColor: 'var(--c-green)', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Nombre</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Categoría</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Precio</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Código</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Estado</th>
              <th style={{ padding: '16px', fontSize: '13px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--c-border)', opacity: p.isActive ? 1 : 0.5 }}>
                <td style={{ padding: '16px', width: '40px' }}>
                  <input 
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds([...selectedProductIds, p.id])
                      } else {
                        setSelectedProductIds(selectedProductIds.filter(id => id !== p.id))
                      }
                    }}
                    style={{ accentColor: 'var(--c-green)', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '16px', color: 'var(--c-text-muted)' }}>
                  {p.category?.emoji} {p.category?.name || '—'}
                </td>
                <td style={{ padding: '16px', color: 'var(--c-green)', fontWeight: 700 }}>${p.price}</td>
                <td style={{ padding: '16px', color: 'var(--c-text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>{p.barcode || '—'}</td>
                <td style={{ padding: '16px' }}>
                  <button
                    onClick={async () => {
                      const token = getToken()
                      if (!token) return
                      try {
                        await apiUpdateProduct(token, p.id, { isActive: !p.isActive })
                        addToast(`⚡ Producto "${p.name}" ${!p.isActive ? 'activado' : 'desactivado'}`)
                        onReload()
                      } catch (err: any) {
                        addToast(`❌ Error: ${err.message || 'No se pudo actualizar estado'}`)
                      }
                    }}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                      background: p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                      color: p.isActive ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {p.isActive ? '● Activo' : '● Inactivo'}
                  </button>
                </td>
                <td style={{ padding: '16px' }}>
                  <button
                    onClick={() => {
                      setSelectedProductForLabel(p)
                      setShowLabelModal(true)
                    }}
                    className="btn-ghost"
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    🏷️ Etiqueta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedProductIds.length > 0 && (
        <div 
          className="animate-slideUp"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '12px 24px',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(34, 197, 94, 0.15)',
            zIndex: 9999,
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--c-text)', fontWeight: 600 }}>
            📦 Seleccionados: <strong style={{ color: 'var(--c-green)', fontSize: '14px' }}>{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'producto' : 'productos'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                setSelectedProductForLabel(null)
                setShowLabelModal(true)
              }}
              className="btn-green" 
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🏷️ Imprimir Etiquetas
            </button>
            <button 
              onClick={() => setSelectedProductIds([])}
              className="btn-ghost" 
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '50px', border: 'none', background: 'rgba(255,255,255,0.05)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      </div>

      {showLabelModal && (selectedProductForLabel || selectedProductIds.length > 0) && (
        <LabelPreviewModal
          products={
            selectedProductForLabel 
              ? [selectedProductForLabel] 
              : products.filter(p => selectedProductIds.includes(p.id))
          }
          onClose={() => {
            setShowLabelModal(false)
            setSelectedProductForLabel(null)
            setSelectedProductIds([])
          }}
        />
      )}
    </div>
  )
}

// ── BULK STOCK ENTRY ───────────────────────────────────────────────────────
function BulkStockEntry({ ingredients, onDone }: { ingredients: Ingredient[]; onDone: () => void }) {
  const [entries, setEntries] = useState([{ ingredientId: '', qty: '' }])
  const [reason, setReason] = useState('Compra de mercancía')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    const token = getToken()
    if (!token) return
    const valid = entries.filter(e => e.ingredientId && Number(e.qty) > 0)
    if (valid.length === 0) return
    setBusy(true); setSuccess(false)
    try {
      await Promise.all(valid.map(e => apiAdjustInventory(token, { ingredientId: e.ingredientId, quantity: Number(e.qty), reason })))
      setEntries([{ ingredientId: '', qty: '' }])
      setReason('Compra de mercancía')
      setSuccess(true)
      onDone()
      setTimeout(() => setSuccess(false), 3000)
    } catch { /* ignore */ }
    finally { setBusy(false) }
  }

  return (
    <div>
      {success && <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '8px', fontSize: '12px', marginBottom: '10px' }}>✅ Stock actualizado correctamente</div>}
      {entries.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <select className="input-dark" style={{ flex: 1, padding: '8px', fontSize: '12px' }} value={entry.ingredientId} onChange={e => { const n = [...entries]; n[idx].ingredientId = e.target.value; setEntries(n) }}>
            <option value="">-- Seleccionar insumo --</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
          <input type="number" min="1" className="input-dark" placeholder="Cantidad" style={{ width: '80px', padding: '8px', fontSize: '12px' }} value={entry.qty} onChange={e => { const n = [...entries]; n[idx].qty = e.target.value; setEntries(n) }} />
          {entries.length > 1 && <button onClick={() => setEntries(entries.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>×</button>}
        </div>
      ))}
      <input className="input-dark" style={{ width: '100%', padding: '8px', fontSize: '12px', marginBottom: '10px' }} placeholder="Motivo (ej. Compra semanal)" value={reason} onChange={e => setReason(e.target.value)} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setEntries([...entries, { ingredientId: '', qty: '' }])} className="btn-ghost" style={{ fontSize: '12px', padding: '8px 12px' }}>+ Otro insumo</button>
        <button onClick={handleSubmit} disabled={busy} className="btn-green" style={{ fontSize: '12px', padding: '8px 16px', flex: 1 }}>
          {busy ? 'Guardando...' : '📥 Registrar Entrada'}
        </button>
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
function AdminIngredients({ ingredients, onReload, addToast }: { ingredients: Ingredient[], onReload: () => void, addToast: (msg: string) => void }) {
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
      addToast(`🎉 Insumo "${form.name}" creado con éxito`)
      setForm({ name: '', unit: 'GRAM', costPerUnit: '', minStock: '' })
      onReload()
    } catch (e: any) {
      addToast(`❌ Error: ${e.message || 'No se pudo crear insumo'}`)
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

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--c-border)', paddingTop: '20px' }}>
          <h4 style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📦 Entrada de Mercancía</h4>
          <BulkStockEntry ingredients={ingredients} onDone={onReload} />
        </div>
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
function AdminRecipes({ products, ingredients, addToast }: { products: Product[], ingredients: Ingredient[], addToast: (msg: string) => void }) {
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
      addToast('✅ Receta guardada exitosamente')
    } catch (e) {
      console.error(e)
      addToast('❌ Error guardando receta')
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
function AdminSecurity({ addToast }: { addToast: (msg: string) => void }) {
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
      addToast('✅ Alerta marcada como resuelta')
      loadSecurityData()
    } catch (e) {
      addToast('❌ Error resolviendo alerta')
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
function AdminSubscriptions({ addToast }: { addToast: (msg: string) => void }) {
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
      addToast('🎉 Plan de suscripción creado con éxito')
      setForm({ name: '', description: '', price: '', intervalDays: '30', smoothiesQty: '', discountPct: '0' })
      loadPlans()
    } catch (err: any) {
      addToast(`❌ Error: ${err.message}`)
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

// ── BRANCHES SECTION ────────────────────────────────────────────────────────
function AdminBranches({ branches, onReload, addToast }: { branches: any[], onReload: () => void, addToast: (msg: string) => void }) {
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      await apiCreateBranch(token, form)
      setForm({ name: '', address: '', phone: '' })
      addToast('🎉 Sucursal creada exitosamente')
      onReload()
    } catch (err: any) {
      addToast(`❌ Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)', marginBottom: '32px' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '20px' }}>🏢 Nueva Sucursal</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input required placeholder="Nombre (ej. Sucursal Norte)" className="input-dark" style={{ flex: 1, minWidth: '150px' }} value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
        <input placeholder="Dirección" className="input-dark" style={{ flex: 2, minWidth: '200px' }} value={form.address} onChange={e=>setForm({...form, address: e.target.value})} />
        <input placeholder="Teléfono" className="input-dark" style={{ flex: 1, minWidth: '120px' }} value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
        <button type="submit" disabled={submitting} className="btn-green" style={{ padding: '12px 24px', height: 'fit-content' }}>
          {submitting ? 'Creando...' : '+ Crear Sucursal'}
        </button>
      </form>

      {branches.length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--c-border)', paddingTop: '20px' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: 'var(--c-text-muted)' }}>
                <th style={{ padding: '8px 0' }}>Nombre</th>
                <th style={{ padding: '8px 0' }}>Dirección</th>
                <th style={{ padding: '8px 0' }}>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 0', fontWeight: 600, color: 'var(--c-green)' }}>{b.name}</td>
                  <td style={{ padding: '10px 0', color: 'var(--c-text-secondary)' }}>{b.address || '—'}</td>
                  <td style={{ padding: '10px 0', color: 'var(--c-text-secondary)' }}>{b.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AdminUsers({ addToast }: { addToast: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
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
    } catch (e: any) {
      setLoadError(e.message || 'Error cargando usuarios — verifica que tengas rol ADMIN u OWNER')
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
      addToast('🎉 Usuario creado con éxito')
      setForm({ name: '', email: '', password: '', role: 'CASHIER', branchId: '', phone: '' })
      loadUsers()
    } catch (err: any) {
      addToast(`❌ Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRole = ROLE_INFO[form.role]

  return (
    <div>
      <AdminBranches branches={branches} onReload={loadUsers} addToast={addToast} />
      
      <div className="admin-grid">
      <div style={{ background: 'var(--c-surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '20px' }}>Nuevo Usuario</h3>

        {loadError && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
            ⚠️ {loadError}
          </div>
        )}
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
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '13px' }}>⏳ Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '13px' }}>
            👥 Aún no hay usuarios registrados. ¡Crea el primero con el formulario!
          </div>
        ) : (
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
        )}
      </div>
      </div>
    </div>
  )
}

// ── BARCODE LABEL PRINTING AUXILIARIES ──────────────────────────────────────
const CODE39_MAP: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
  '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
};

function Barcode({ value, barWidth = 1.2, height = 35 }: { value: string; barWidth?: number; height?: number }) {
  const cleanVal = value.toUpperCase().replace(/[^0-9A-Z\-\.\s\$\/\+\%]/g, '');
  const padded = `*${cleanVal}*`;
  let bitString = '';
  for (let i = 0; i < padded.length; i++) {
    const char = padded[i];
    bitString += (CODE39_MAP[char] || CODE39_MAP['*']) + '0';
  }

  const rects = [];
  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === '1') {
      rects.push(
        <rect
          key={i}
          x={i * barWidth}
          y={0}
          width={barWidth}
          height={height}
          fill="black"
        />
      );
    }
  }

  const svgWidth = bitString.length * barWidth;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={svgWidth} height={height}>
        {rects}
      </svg>
      <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '2px', marginTop: '3px', color: 'black' }}>
        {cleanVal}
      </div>
    </div>
  );
}

function QRCodeComponent({ value, size = 60 }: { value: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 3, // Premium sharp details
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (active) setQrUrl(url);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!qrUrl) {
    return <div style={{ width: size, height: size, background: '#f3f4f6', borderRadius: '4px' }} />;
  }

  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      style={{ width: size, height: size, display: 'block', imageRendering: 'pixelated' }} 
    />
  );
}

interface LabelPreviewModalProps {
  products: Product[];
  onClose: () => void;
}

function LabelPreviewModal({ products, onClose }: LabelPreviewModalProps) {
  const [labelWidth, setLabelWidth] = useState(50); // in mm
  const [labelHeight, setLabelHeight] = useState(30); // in mm
  const [isExporting, setIsExporting] = useState(false);
  
  // Interactive control states
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = 1;
    });
    return initial;
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preset, setPreset] = useState<'50x30' | '60x40' | '30x20' | '80x50' | 'custom'>('50x30');
  const [template, setTemplate] = useState<'completo' | 'compacto' | 'horizontal'>('completo');
  const [useQR, setUseQR] = useState(false);

  // Fallback barcode generation helper
  const getBarcodeValue = (p: Product) => p.barcode || `NAT-${p.id.slice(-6).toUpperCase()}`;

  // Handle standard sized rolls automatically
  const handlePresetChange = (val: string) => {
    setPreset(val as any);
    if (val === '50x30') {
      setLabelWidth(50);
      setLabelHeight(30);
    } else if (val === '60x40') {
      setLabelWidth(60);
      setLabelHeight(40);
    } else if (val === '30x20') {
      setLabelWidth(30);
      setLabelHeight(20);
    } else if (val === '80x50') {
      setLabelWidth(80);
      setLabelHeight(50);
    }
  };

  const activeProduct = products[currentIndex] || products[0];
  const barcodeValue = getBarcodeValue(activeProduct);

  // Dynamic vector calculations
  const cleanValForBar = barcodeValue.toUpperCase().replace(/[^0-9A-Z\-\.\s\$\/\+\%]/g, '');
  const bitStringLength = (cleanValForBar.length + 2) * 13;
  const labelWidthPx = labelWidth * 3.78;
  const labelHeightPx = labelHeight * 3.78;
  
  const optimalBarWidth = Math.max(0.7, Math.min(1.5, (labelWidthPx - 20) / bitStringLength));
  
  const optimalBarHeight = template === 'completo'
    ? Math.max(18, Math.min(40, labelHeightPx - 72))
    : template === 'compacto'
      ? Math.max(24, Math.min(55, labelHeightPx - 40))
      : Math.max(18, Math.min(40, labelHeightPx - 26));

  const optimalQRSize = template === 'completo'
    ? Math.max(30, Math.min(80, labelHeightPx - 68))
    : template === 'compacto'
      ? Math.max(35, Math.min(100, labelHeightPx - 34))
      : Math.max(35, Math.min(95, labelHeightPx - 16));

  const totalLabelsToPrint = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Create a jsPDF document using selected roll paper format in mm
      const pdf = new jsPDF({
        orientation: labelWidth > labelHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [labelWidth, labelHeight]
      });

      let exportPageCount = 0;

      // Asynchronously render and capture each label in the scheduled batch queue
      for (let pIndex = 0; pIndex < products.length; pIndex++) {
        const p = products[pIndex];
        const qty = quantities[p.id] || 1;
        for (let q = 0; q < qty; q++) {
          const elementId = `label-print-${p.id}-${q}`;
          const element = document.getElementById(elementId);
          if (!element) continue;

          const canvas = await html2canvas(element, {
            scale: 4, // Outstanding vectors resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');

          // Push to a new sheet for subsequent labels
          if (exportPageCount > 0) {
            pdf.addPage([labelWidth, labelHeight], labelWidth > labelHeight ? 'landscape' : 'portrait');
          }

          pdf.addImage(imgData, 'PNG', 0, 0, labelWidth, labelHeight);
          exportPageCount++;
        }
      }

      pdf.save(`etiquetas-${products.length === 1 ? products[0].name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'lote'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '460px', background: 'var(--c-surface-1)', color: 'var(--c-text)', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Imprimir Etiquetas</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          {/* 1. Quantities selection list (shown only in Batch Mode) */}
          {products.length > 1 && (
            <div style={{ background: 'var(--c-surface-2)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Copias por Producto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '110px', overflowY: 'auto', paddingRight: '2px' }}>
                {products.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [p.id]: Math.max(1, (q[p.id] || 1) - 1) }))}
                        style={{ border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--c-text)', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >-</button>
                      <span style={{ width: '22px', textAlign: 'center', fontWeight: '800', color: 'var(--c-green)' }}>{quantities[p.id] || 1}</span>
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [p.id]: (q[p.id] || 1) + 1 }))}
                        style={{ border: 'none', background: 'rgba(255,255,255,0.06)', color: 'var(--c-text)', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Controls Panel (Presets, Templates, QR) */}
          <div style={{ background: 'var(--c-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚙️ Configuración del Formato</div>
            
            {/* Presets Select */}
            <div>
              <div style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--c-text-secondary)' }}>Tamaño del Rollo:</div>
              <select 
                value={preset} 
                onChange={e => handlePresetChange(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--c-border)', background: 'var(--c-surface-1)', color: 'var(--c-text)', outline: 'none' }}
              >
                <option value="50x30">50 x 30 mm (Estándar Térmico)</option>
                <option value="60x40">60 x 40 mm (Mediano)</option>
                <option value="30x20">30 x 20 mm (Compacto)</option>
                <option value="80x50">80 x 50 mm (Grande / Envío)</option>
                <option value="custom">Personalizado (Manual)</option>
              </select>
            </div>

            {/* Custom Paper Size Sliders */}
            {preset === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span>Ancho del Papel:</span>
                    <span style={{ fontWeight: 800, color: 'var(--c-green)' }}>{labelWidth} mm</span>
                  </div>
                  <input type="range" min="30" max="80" value={labelWidth} onChange={e => setLabelWidth(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--c-green)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span>Alto del Papel:</span>
                    <span style={{ fontWeight: 800, color: 'var(--c-green)' }}>{labelHeight} mm</span>
                  </div>
                  <input type="range" min="20" max="60" value={labelHeight} onChange={e => setLabelHeight(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--c-green)' }} />
                </div>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <div style={{ fontSize: '13px', marginBottom: '4px', color: 'var(--c-text-secondary)' }}>Estructura de la Plantilla:</div>
              <div style={{ display: 'flex', background: 'var(--c-surface-1)', borderRadius: '8px', padding: '3px', border: '1px solid var(--c-border)' }}>
                <button 
                  onClick={() => setTemplate('completo')}
                  style={{ flex: 1, padding: '6px 8px', fontSize: '11px', border: 'none', borderRadius: '6px', background: template === 'completo' ? 'var(--c-green)' : 'transparent', color: template === 'completo' ? 'white' : 'var(--c-text-muted)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Completa
                </button>
                <button 
                  onClick={() => setTemplate('compacto')}
                  style={{ flex: 1, padding: '6px 8px', fontSize: '11px', border: 'none', borderRadius: '6px', background: template === 'compacto' ? 'var(--c-green)' : 'transparent', color: template === 'compacto' ? 'white' : 'var(--c-text-muted)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Compacta
                </button>
                <button 
                  onClick={() => setTemplate('horizontal')}
                  style={{ flex: 1, padding: '6px 8px', fontSize: '11px', border: 'none', borderRadius: '6px', background: template === 'horizontal' ? 'var(--c-green)' : 'transparent', color: template === 'horizontal' ? 'white' : 'var(--c-text-muted)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Horizontal
                </button>
              </div>
            </div>

            {/* QR/Barcode Toggle Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)' }}>Usar Código QR en vez de Barras:</span>
              <div 
                onClick={() => setUseQR(!useQR)}
                style={{
                  width: '42px',
                  height: '22px',
                  background: useQR ? 'var(--c-green)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '100px',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: useQR ? 'flex-end' : 'flex-start',
                  transition: 'all 0.2s',
                  boxShadow: useQR ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
                }}
              >
                <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%' }} />
              </div>
            </div>
          </div>

          {/* 3. Scaled Real Preview Panel */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>VISTA PREVIA REAL</div>
            
            <div style={{
              width: 'fit-content',
              height: 'fit-content',
              background: 'white',
              borderRadius: '4px',
              border: '2px dashed var(--c-green)',
              display: 'flex',
              boxSizing: 'border-box',
              margin: '0 auto',
              overflow: 'hidden',
            }}>
              <div id="label-capture-content" style={{
                width: `${labelWidth}mm`,
                height: `${labelHeight}mm`,
                background: 'white',
                color: 'black',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                overflow: 'hidden',
                padding: '6px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}>
                {template === 'completo' && (
                  <>
                    <div style={{ fontSize: '7px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px', lineHeight: '1.2' }}>Natural by Nutrit</div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      width: '100%',
                      textAlign: 'center',
                      lineHeight: '1.3',
                      margin: '2px 0',
                      paddingTop: '1px',
                      paddingBottom: '1px',
                      wordBreak: 'break-word',
                      maxHeight: '2.6em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>{activeProduct.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, margin: '2px 0', lineHeight: '1.2' }}>${activeProduct.price}</div>
                    <div style={{ margin: '2px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {useQR ? (
                        <QRCodeComponent value={barcodeValue} size={optimalQRSize} />
                      ) : (
                        <Barcode value={barcodeValue} barWidth={optimalBarWidth} height={optimalBarHeight} />
                      )}
                    </div>
                  </>
                )}
                {template === 'compacto' && (
                  <>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      width: '100%',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      marginBottom: '4px',
                      paddingTop: '1px',
                      wordBreak: 'break-word',
                      maxHeight: '2.4em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>{activeProduct.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {useQR ? (
                        <QRCodeComponent value={barcodeValue} size={optimalQRSize} />
                      ) : (
                        <Barcode value={barcodeValue} barWidth={optimalBarWidth * 1.1} height={optimalBarHeight} />
                      )}
                    </div>
                  </>
                )}
                {template === 'horizontal' && (
                  <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '2px', boxSizing: 'border-box' }}>
                    <div style={{ width: '45%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', height: '100%' }}>
                      <div style={{ fontSize: '6px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '2px' }}>Natural</div>
                      <div style={{ fontSize: '9px', fontWeight: 900, lineHeight: '1.2', margin: '2px 0', wordBreak: 'break-word', maxHeight: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', color: 'black' }}>{activeProduct.name}</div>
                      <div style={{ fontSize: '11px', fontWeight: 900, color: 'black', marginTop: '2px' }}>${activeProduct.price}</div>
                    </div>
                    <div style={{ width: '55%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      {useQR ? (
                        <QRCodeComponent value={barcodeValue} size={optimalQRSize} />
                      ) : (
                        <Barcode value={barcodeValue} barWidth={optimalBarWidth * 0.9} height={optimalBarHeight * 0.8} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paging controls for Batch previews */}
            {products.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <button 
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  className="btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px', border: 'none', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', opacity: currentIndex === 0 ? 0.3 : 1 }}
                >
                  ◀ Ant.
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c-text-muted)' }}>
                  Etiqueta <strong style={{ color: 'var(--c-text)' }}>{currentIndex + 1}</strong> de {products.length}
                </span>
                <button 
                  disabled={currentIndex === products.length - 1}
                  onClick={() => setCurrentIndex(i => Math.min(products.length - 1, i + 1))}
                  className="btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px', border: 'none', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', opacity: currentIndex === products.length - 1 ? 0.3 : 1 }}
                >
                  Sig. ▶
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action guidelines helper card */}
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', padding: '12px', borderRadius: '10px', fontSize: '11px', color: 'var(--c-text-secondary)', marginBottom: '16px', lineHeight: '1.4', flexShrink: 0 }}>
          💡 <strong>Tip de Impresión:</strong> Margen: <strong>Ninguno</strong> y desactiva <strong>Cabeceras/Pies</strong>. Impresión en Lote: Se generará 1 página por etiqueta autoadhesiva automáticamente.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn-green" style={{ flex: 1, padding: '12px', fontSize: '13px' }}>
              🖨️ Imprimir ({totalLabelsToPrint})
            </button>
            <button onClick={handleDownloadPDF} disabled={isExporting} className="btn-ghost" style={{ flex: 1, padding: '12px', fontSize: '13px' }}>
              {isExporting ? '⏳ Generando...' : '📄 Guardar PDF'}
            </button>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ width: '100%', padding: '10px', fontSize: '12px', border: 'none', background: 'rgba(255,255,255,0.03)' }}>
            Cerrar
          </button>
        </div>
        </div>

        {/* Target print container - absolute positioned off-screen normally, displayed absolute by @media print */}
        <div id="printable-label" style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: 'auto',
          height: 'auto',
          display: 'block',
        }}>
          {products.flatMap(p => {
            const qty = quantities[p.id] || 1;
            const barcodeVal = getBarcodeValue(p);
            const cleanVal = barcodeVal.toUpperCase().replace(/[^0-9A-Z\-\.\s\$\/\+\%]/g, '');
            const bitStringLen = (cleanVal.length + 2) * 13;
            
            const barW = Math.max(0.7, Math.min(1.5, (labelWidthPx - 20) / bitStringLen));
            
            const barH = template === 'completo'
              ? Math.max(18, Math.min(40, labelHeightPx - 72))
              : template === 'compacto'
                ? Math.max(24, Math.min(55, labelHeightPx - 40))
                : Math.max(18, Math.min(40, labelHeightPx - 26));

            const qrS = template === 'completo'
              ? Math.max(30, Math.min(80, labelHeightPx - 68))
              : template === 'compacto'
                ? Math.max(35, Math.min(100, labelHeightPx - 34))
                : Math.max(35, Math.min(95, labelHeightPx - 16));

            const labelsArray = [];
            for (let i = 0; i < qty; i++) {
              labelsArray.push(
                <div 
                  key={`${p.id}-${i}`}
                  id={`label-print-${p.id}-${i}`}
                  className="printable-label-page"
                  style={{
                    width: `${labelWidth}mm`,
                    height: `${labelHeight}mm`,
                    background: 'white',
                    color: 'black',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    padding: '6px',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  {template === 'completo' && (
                    <>
                      <div style={{ fontSize: '7px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '2px', lineHeight: '1.2' }}>Natural by Nutrit</div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        width: '100%',
                        textAlign: 'center',
                        lineHeight: '1.3',
                        margin: '2px 0',
                        paddingTop: '1px',
                        paddingBottom: '1px',
                        wordBreak: 'break-word',
                        maxHeight: '2.6em',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>{p.name}</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, margin: '2px 0', lineHeight: '1.2' }}>${p.price}</div>
                      <div style={{ margin: '2px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {useQR ? (
                          <QRCodeComponent value={barcodeVal} size={qrS} />
                        ) : (
                          <Barcode value={barcodeVal} barWidth={barW} height={barH} />
                        )}
                      </div>
                    </>
                  )}
                  {template === 'compacto' && (
                    <>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        width: '100%',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        marginBottom: '4px',
                        paddingTop: '1px',
                        wordBreak: 'break-word',
                        maxHeight: '2.4em',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>{p.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {useQR ? (
                          <QRCodeComponent value={barcodeVal} size={qrS} />
                        ) : (
                          <Barcode value={barcodeVal} barWidth={barW * 1.1} height={barH} />
                        )}
                      </div>
                    </>
                  )}
                  {template === 'horizontal' && (
                    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '2px', boxSizing: 'border-box' }}>
                      <div style={{ width: '45%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left', height: '100%' }}>
                        <div style={{ fontSize: '6px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '2px' }}>Natural</div>
                        <div style={{ fontSize: '9px', fontWeight: 900, lineHeight: '1.2', margin: '2px 0', wordBreak: 'break-word', maxHeight: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', color: 'black' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'black', marginTop: '2px' }}>${p.price}</div>
                      </div>
                      <div style={{ width: '55%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        {useQR ? (
                          <QRCodeComponent value={barcodeVal} size={qrS} />
                        ) : (
                          <Barcode value={barcodeVal} barWidth={barW * 0.9} height={barH * 0.8} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return labelsArray;
          })}
        </div>
      </div>
    </div>
  );
}

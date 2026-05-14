'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getToken, getUser, clearSession,
  apiGetProducts, apiGetCategories,
  apiSearchCustomers, apiCreateOrder,
  type Product, type Category, type Customer,
} from '@/lib/api'

// ── Types ───────────────────────────────────────────
interface CartItem extends Product { qty: number }

// ── Static Data ──────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'CASH',     label: 'Efectivo', emoji: '💵' },
  { id: 'CARD',     label: 'Tarjeta',  emoji: '💳' },
  { id: 'TRANSFER', label: 'Transfer', emoji: '📲' },
  { id: 'WALLET',   label: 'Wallet',   emoji: '👛' },
  { id: 'QR',       label: 'QR',       emoji: '📱' },
]

const LEVEL_COLORS: Record<string, string> = {
  VERDE: '#22c55e', GOLD: '#f59e0b', ELITE: '#8b5cf6', LEGEND: '#ec4899',
}

const ALL_CAT = { id: 'all', name: 'Todo', emoji: '✨' }

const fmt = (n: number) => `$${n.toFixed(2)}`
const clock = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

// ── Main Component ───────────────────────────────────
export default function POSPage() {
  const router = useRouter()
  const user   = getUser()

  const [time, setTime]             = useState(clock())
  const [category, setCategory]     = useState('all')
  const [search, setSearch]         = useState('')
  const [cart, setCart]             = useState<CartItem[]>([])
  const [phoneQuery, setPhoneQuery] = useState('')
  const [customer, setCustomer]     = useState<Customer | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [paymentMethod, setPaymentMethod]     = useState('CASH')
  const [showPayModal, setShowPayModal]       = useState(false)
  const [cashGiven, setCashGiven]   = useState('')
  const [orderDone, setOrderDone]   = useState(false)
  const [paying, setPaying]         = useState(false)
  const [payError, setPayError]     = useState('')

  // Catalog state
  const [products, setProducts]       = useState<Product[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // Fetch catalog on mount
  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }

    const t = setInterval(() => setTime(clock()), 30000)

    setCatalogLoading(true)
    Promise.all([
      apiGetProducts(token),
      apiGetCategories(token),
    ]).then(([prods, cats]) => {
      setProducts(prods)
      setCategories(cats)
    }).catch(console.error)
      .finally(() => setCatalogLoading(false))

    return () => clearInterval(t)
  }, [router])

  // Customer search — debounced
  useEffect(() => {
    const token = getToken()
    if (!token || phoneQuery.length < 6) { setCustomer(null); return }
    const id = setTimeout(async () => {
      setCustomerLoading(true)
      try {
        const results = await apiSearchCustomers(token, phoneQuery)
        setCustomer(results[0] ?? null)
      } catch {
        setCustomer(null)
      } finally {
        setCustomerLoading(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [phoneQuery])

  const addToCart = useCallback((p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      return ex ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...p, qty: 1 }]
    })
  }, [])

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0))
  }

  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discount   = customer ? Math.round(subtotal * 0.05) : 0
  const finalTotal = subtotal - discount
  const pointsEarned = Math.floor(finalTotal * 0.05)
  const change     = paymentMethod === 'CASH' && cashGiven ? Math.max(0, Number(cashGiven) - finalTotal) : 0

  const catList = [ALL_CAT, ...categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '📦' }))]

  const filtered = products.filter(p =>
    p.isActive &&
    (category === 'all' || p.categoryId === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  async function handlePay() {
    const token = getToken()
    if (!token) return
    setPaying(true)
    setPayError('')
    try {
      await apiCreateOrder(token, {
        customerId: customer?.id,
        subtotal,
        total: finalTotal,
        items: cart.map(i => ({
          productId: i.id,
          quantity: i.qty,
          unitPrice: i.price,
          subtotal: i.price * i.qty,
        })),
        payments: [{ method: paymentMethod, amount: finalTotal }],
        pointsEarned: customer ? pointsEarned : 0,
      })
      setOrderDone(true)
      setTimeout(() => {
        setCart([])
        setCustomer(null)
        setPhoneQuery('')
        setCashGiven('')
        setPaymentMethod('CASH')
        setShowPayModal(false)
        setOrderDone(false)
      }, 2200)
    } catch (e: any) {
      setPayError(e.message ?? 'Error al procesar el pago')
    } finally {
      setPaying(false)
    }
  }

  // ── Styles ────────────────────────────────────────
  const S = {
    wrap:   { display: 'flex', flexDirection: 'column' as const, height: '100vh', background: 'var(--c-bg)' },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: '56px', flexShrink: 0,
      background: 'var(--c-surface-1)', borderBottom: '1px solid var(--c-border)',
    },
    main:  { display: 'flex', flex: 1, overflow: 'hidden' },
    left:  { flex: 1, display: 'flex', flexDirection: 'column' as const, borderRight: '1px solid var(--c-border)', overflow: 'hidden' },
    right: { width: '380px', display: 'flex', flexDirection: 'column' as const, background: 'var(--c-surface-1)' },
  }

  return (
    <div style={S.wrap}>

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--c-green), var(--c-lime-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          }}>🌿</div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--c-text)' }}>Natural OS</span>
          <span style={{ fontSize: '12px', color: 'var(--c-text-muted)', paddingLeft: '8px', borderLeft: '1px solid var(--c-border)' }}>
            {user?.name ? `Cajero: ${user.name}` : 'POS'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-green)', fontVariantNumeric: 'tabular-nums' }}>
            {time}
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/cash-register" style={{ fontSize: '12px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>💰 Corte de Caja</a>
            <a href="/inventory" style={{ fontSize: '12px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>📦 Inventario</a>
            <a href="/dashboard" style={{ fontSize: '12px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>📊 Dashboard</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--c-border)', paddingLeft: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--c-green)', animation: 'pulse-green 2s infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--c-text-secondary)' }}>{user?.name || 'Cajero'}</span>
          </div>
          <button onClick={() => { clearSession(); router.push('/login') }}
            style={{ fontSize: '12px', color: 'var(--c-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      <div style={S.main}>

        {/* ── LEFT: Product Catalog ── */}
        <div style={S.left}>

          {/* Search + Categories */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
            <input
              id="pos-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Buscar producto..."
              className="input-dark"
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {catList.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 'var(--r-full)',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: category === c.id ? 'var(--c-green)' : 'var(--c-surface-2)',
                    color: category === c.id ? '#000' : 'var(--c-text-secondary)',
                    transition: 'var(--t-mid)',
                  }}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 16px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px',
            alignContent: 'start',
          }}>
            {catalogLoading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                Cargando catálogo...
              </div>
            ) : filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)}
                style={{
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r-lg)', padding: '16px 12px', cursor: 'pointer',
                  textAlign: 'center', transition: 'var(--t-mid)', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--c-green)'
                  el.style.background = 'var(--c-surface-3)'
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 4px 16px rgba(34,197,94,0.15)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'var(--c-border)'
                  el.style.background = 'var(--c-surface-2)'
                  el.style.transform = 'translateY(0)'
                  el.style.boxShadow = 'none'
                }}
              >
                <span style={{ fontSize: '30px' }}>{p.category?.emoji ?? '📦'}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.3 }}>{p.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--c-text-muted)', lineHeight: 1.3 }}>{p.description ?? ''}</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-green)', marginTop: '4px' }}>{fmt(p.price)}</span>
              </button>
            ))}
            {!catalogLoading && filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--c-text-muted)' }}>
                {products.length === 0 ? '⚠️ No hay productos en el catálogo. Agrégalos desde el panel de administración.' : 'No se encontraron productos'}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div style={S.right}>

          {/* Customer Search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
            <input
              id="customer-phone"
              value={phoneQuery}
              onChange={e => setPhoneQuery(e.target.value.replace(/\D/g, ''))}
              placeholder="📱 Teléfono del cliente..."
              className="input-dark"
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
              maxLength={10}
            />
            {customerLoading && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--c-text-muted)' }}>Buscando...</div>
            )}
            {!customerLoading && customer && (
              <div style={{
                marginTop: '10px', padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--c-surface-2)', border: `1px solid ${LEVEL_COLORS[customer.level] ?? '#333'}40`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)' }}>{customer.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
                    ⭐ {customer.points.toFixed(0)} pts · {customer.totalVisits} visitas
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 700,
                  background: `${LEVEL_COLORS[customer.level] ?? '#555'}20`, color: LEVEL_COLORS[customer.level] ?? '#aaa',
                }}>
                  {customer.level}
                </span>
              </div>
            )}
            {!customerLoading && phoneQuery.length >= 6 && !customer && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--c-text-muted)' }}>
                Cliente no encontrado
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                <div style={{ fontSize: '14px' }}>El carrito está vacío</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Agrega productos desde el catálogo</div>
              </div>
            ) : cart.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 0', borderBottom: '1px solid var(--c-border)',
              }}>
                <span style={{ fontSize: '20px' }}>{item.category?.emoji ?? '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--c-green)', fontWeight: 600 }}>{fmt(item.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => updateQty(item.id, -1)} className="btn-ghost"
                    style={{ width: '26px', height: '26px', padding: 0, fontSize: '16px', borderRadius: 'var(--r-sm)' }}>−</button>
                  <span style={{ width: '20px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, +1)} className="btn-ghost"
                    style={{ width: '26px', height: '26px', padding: 0, fontSize: '16px', borderRadius: 'var(--r-sm)' }}>+</button>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--c-text)', width: '56px', textAlign: 'right' }}>
                  {fmt(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary + Cobrar */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--c-border)', flexShrink: 0 }}>
            {customer && discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Descuento cliente (5%)</span>
                <span style={{ color: 'var(--c-green)' }}>−{fmt(discount)}</span>
              </div>
            )}
            {customer && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Natural Points a ganar</span>
                <span style={{ color: '#f59e0b' }}>+{pointsEarned} pts</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>TOTAL</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--c-green)' }}>{fmt(finalTotal)}</span>
            </div>

            {/* Payment method pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  style={{
                    flex: 1, padding: '8px 4px', fontSize: '12px', fontWeight: 600,
                    borderRadius: 'var(--r-md)', cursor: 'pointer', border: '1px solid',
                    borderColor: paymentMethod === m.id ? 'var(--c-green)' : 'var(--c-border)',
                    background: paymentMethod === m.id ? 'var(--c-green-glow)' : 'transparent',
                    color: paymentMethod === m.id ? 'var(--c-green)' : 'var(--c-text-muted)',
                    transition: 'var(--t-fast)',
                  }}>
                  {m.emoji}<br />{m.label}
                </button>
              ))}
            </div>

            <button id="btn-cobrar" onClick={() => cart.length > 0 && setShowPayModal(true)}
              disabled={cart.length === 0}
              className="btn-green"
              style={{
                width: '100%', padding: '16px', fontSize: '17px', borderRadius: 'var(--r-lg)',
                opacity: cart.length === 0 ? 0.4 : 1,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              }}>
              💳 COBRAR {fmt(finalTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showPayModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }} onClick={() => !orderDone && !paying && setShowPayModal(false)}>
          <div className="glass" onClick={e => e.stopPropagation()}
            style={{ width: '400px', borderRadius: 'var(--r-xl)', padding: '32px', animation: 'fadeIn 0.2s ease' }}>

            {orderDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>¡Cobro exitoso!</h3>
                <p style={{ color: 'var(--c-green)', fontWeight: 600 }}>{fmt(finalTotal)} procesado</p>
                {customer && (
                  <p style={{ fontSize: '13px', color: '#f59e0b', marginTop: '8px' }}>
                    +{pointsEarned} Natural Points para {customer.name}
                  </p>
                )}
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', color: 'var(--c-text)' }}>Confirmar cobro</h3>
                <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '24px' }}>
                  {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.emoji} {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                  {customer && ` · ${customer.name}`}
                </p>

                <div style={{ background: 'var(--c-surface-2)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '20px' }}>
                  {cart.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--c-text-secondary)' }}>{i.category?.emoji ?? '📦'} {i.name} x{i.qty}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(i.price * i.qty)}</span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--c-green)', borderTop: '1px solid var(--c-border)', paddingTop: '8px', marginTop: '4px' }}>
                      <span>Descuento 5%</span><span>−{fmt(discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)', paddingTop: '12px', marginTop: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--c-green)' }}>{fmt(finalTotal)}</span>
                  </div>
                </div>

                {paymentMethod === 'CASH' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Efectivo recibido
                    </label>
                    <input value={cashGiven} onChange={e => setCashGiven(e.target.value.replace(/\D/g, ''))}
                      placeholder="$0.00" type="number" className="input-dark"
                      style={{ width: '100%', padding: '12px 14px', fontSize: '18px', fontWeight: 700 }} />
                    {cashGiven && Number(cashGiven) >= finalTotal && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(34,197,94,0.1)', fontSize: '14px' }}>
                        Cambio: <strong style={{ color: 'var(--c-green)' }}>{fmt(change)}</strong>
                      </div>
                    )}
                  </div>
                )}

                {payError && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(239,68,68,0.1)', fontSize: '13px', color: '#ef4444' }}>
                    ⚠️ {payError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowPayModal(false)} className="btn-ghost"
                    style={{ flex: 1, padding: '13px', fontSize: '14px' }} disabled={paying}>Cancelar</button>
                  <button onClick={handlePay} className="btn-green"
                    style={{ flex: 2, padding: '13px', fontSize: '15px' }}
                    disabled={paying || (paymentMethod === 'CASH' && cashGiven !== '' && Number(cashGiven) < finalTotal)}>
                    {paying ? '⏳ Procesando...' : '✅ Confirmar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import InstallPrompt from '@/components/InstallPrompt'
import {
  getToken, getUser, clearSession,
  apiGetProducts, apiGetCategories,
  apiSearchCustomers, apiCreateOrder,
  apiGetSubscriptionPlans, apiSubscribeCustomer,
  apiCreateCheckoutSession, apiGetActiveRegister,
  type Product, type Category, type Customer,
} from '@/lib/api'
import { printTicketWebUSB } from '@/lib/printer'
import { getSocket } from '@/lib/socket'
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

  const [time, setTime]             = useState('')
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
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [paying, setPaying]         = useState(false)
  const [payError, setPayError]     = useState('')
  const [toasts, setToasts]         = useState<string[]>([])

  const addToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 5000)
  }

  // Subscription state
  const [plans, setPlans]           = useState<any[]>([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [submittingSub, setSubmittingSub] = useState(false)
  
  // Ticket State
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [activeRegister, setActiveRegister] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Monitor connectivity
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    
    // Check pending orders from localStorage
    const checkPending = () => {
      const raw = localStorage.getItem('pending_orders')
      if (raw) {
        try {
          const list = JSON.parse(raw)
          setPendingCount(list.length)
        } catch { setPendingCount(0) }
      } else {
        setPendingCount(0)
      }
    }
    const id = setInterval(checkPending, 5000)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      clearInterval(id)
    }
  }, [])

  // Catalog state
  const [products, setProducts]       = useState<Product[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // Fetch catalog on mount
  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }

    setTime(clock())
    const timer = setInterval(() => setTime(clock()), 30000)

    setCatalogLoading(true)
    Promise.all([
      apiGetProducts(token),
      apiGetCategories(token),
      apiGetActiveRegister(token).catch(() => null),
    ]).then(([prods, cats, reg]) => {
      setProducts(prods)
      setCategories(cats)
      setActiveRegister(reg)
    }).catch(console.error)
      .finally(() => setCatalogLoading(false))

    return () => clearInterval(timer)
  }, [router])

  // Auto-focus search on load
  useEffect(() => {
    if (!catalogLoading) searchRef.current?.focus()
  }, [catalogLoading])



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

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discount    = customer ? Math.round(subtotal * 0.05) : 0
  const redeemed    = Number(pointsToRedeem) || 0
  const finalTotal  = Math.max(0, subtotal - discount - redeemed)
  const pointsEarned = Math.floor(finalTotal * 0.10)
  const change      = paymentMethod === 'CASH' && cashGiven ? Math.max(0, Number(cashGiven) - finalTotal) : 0

  const handlePay = useCallback(async () => {
    if (paying || cart.length === 0) return
    const token = getToken()
    if (!token) return
    
    if (!activeRegister) {
      setPayError('❌ Debes ABRIR LA CAJA antes de poder realizar ventas.')
      setPaying(false)
      return
    }

    setPaying(true)
    setPayError('')
    try {
      const redeemed = Number(pointsToRedeem) || 0
      const payments = []
      if (redeemed > 0) payments.push({ method: 'POINTS', amount: redeemed })
      if (finalTotal > 0) payments.push({ method: paymentMethod, amount: finalTotal })

      const orderData = await apiCreateOrder(token, {
        customerId: customer?.id,
        subtotal,
        discountAmount: discount,
        total: finalTotal,
        items: cart.map(i => ({
          productId: i.id,
          quantity: i.qty,
          unitPrice: i.price,
          subtotal: i.price * i.qty,
        })),
        payments,
        pointsEarned: customer ? Math.floor(finalTotal * 0.1) : 0,
        pointsRedeemed: redeemed,
      })

      setLastOrder(orderData)
      setShowPayModal(false)
      setShowSuccess(true)
      
      if (orderData.inventoryWarnings?.length) {
        orderData.inventoryWarnings.forEach((msg: string) => addToast(msg))
      }
      
      // Reset POS
      setCart([])
      setCustomer(null)
      setPhoneQuery('')
      setPointsToRedeem('')
      setCashGiven('')
    } catch (e: any) {
      setPayError(e.message ?? 'Error al procesar el pago')
    } finally {
      setPaying(false)
    }
  }, [paying, cart, activeRegister, customer, subtotal, discount, finalTotal, pointsToRedeem, paymentMethod, cashGiven, addToast])

  // Keyboard shortcut: Enter = confirm payment when modal open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showPayModal && !paying) {
        const canPay = paymentMethod !== 'CASH' || !cashGiven || Number(cashGiven) >= finalTotal
        if (canPay && cart.length > 0) handlePay()
      }
      if (e.key === 'Escape' && showPayModal) setShowPayModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPayModal, paying, paymentMethod, cashGiven, finalTotal, cart, handlePay])

  // Emit cart updates for Customer Facing Display
  useEffect(() => {
    if (user?.organizationId) {
      const socket = getSocket(user.organizationId);
      socket.emit('cart_update', {
        orgId: user.organizationId,
        cart,
        subtotal,
        discount,
        total: finalTotal
      });
    }
  }, [cart, subtotal, discount, finalTotal, user]);

  const catList = [ALL_CAT, ...categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '📦' }))]

  const filtered = products.filter(p =>
    p.isActive &&
    (category === 'all' || p.categoryId === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.barcode === search)
  )

  // Autodetect Barcode Scan
  useEffect(() => {
    if (search.length >= 8) {
      const prod = products.find(p => p.barcode === search)
      if (prod) {
        setCart(prev => {
          const exists = prev.find(i => i.id === prod.id)
          if (exists) return prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
          return [...prev, { ...prod, qty: 1 }]
        })
        setSearch('')
      }
    }
  }, [search, products])

  const handleOpenSubModal = async () => {
    const token = getToken()
    if (!token) return
    try {
      const p = await apiGetSubscriptionPlans(token)
      setPlans(p)
      setShowSubModal(true)
    } catch (e) {
      alert('Error al cargar planes')
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!customer) return
    const token = getToken()
    if (!token) return
    setSubmittingSub(true)
    try {
      await apiSubscribeCustomer(token, customer.id, planId)
      alert('¡Cliente suscrito con éxito!')
      setShowSubModal(false)
    } catch (e) {
      alert('Error al suscribir')
    } finally {
      setSubmittingSub(false)
    }
  }

  const handleSubscribeStripe = async (planId: string) => {
    if (!customer) return
    const token = getToken()
    if (!token) return
    setSubmittingSub(true)
    try {
      const { url } = await apiCreateCheckoutSession(token, customer.id, planId)
      window.location.href = url
    } catch (e) {
      alert('Error al iniciar pago con Stripe')
    } finally {
      setSubmittingSub(false)
    }
  }


  // ── Styles ────────────────────────────────────────
  return (
    <div className="flex flex-col h-dvh bg-black overflow-hidden">
      <InstallPrompt />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 bg-zinc-950 border-b border-zinc-900 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xl font-black text-green-500 tracking-tighter">NATURA OS</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest -mt-1">Enterprise Edition</span>
          </div>
          
          <div className="flex gap-4 md:gap-4">
            <a href="/cash-register" className="text-base md:text-xs text-zinc-400 no-underline hover:text-green-500" title="Corte de Caja">💰<span className="hide-mobile ml-1">Caja</span></a>
            <a href="/ventas" className="text-base md:text-xs text-zinc-400 no-underline hover:text-green-500" title="Ventas">📋<span className="hide-mobile ml-1">Ventas</span></a>
            <a href="/inventory" className="text-base md:text-xs text-zinc-400 no-underline hover:text-green-500" title="Stock">📦<span className="hide-mobile ml-1">Stock</span></a>
            <a href="/dashboard" className="text-base md:text-xs text-zinc-400 no-underline hover:text-green-500" title="Dashboard">📊<span className="hide-mobile ml-1">Dashboard</span></a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SYNC STATUS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '20px', background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', boxShadow: isOnline ? '0 0 8px #22c55e' : 'none' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: isOnline ? '#22c55e' : '#ef4444' }}>
              {isOnline ? (pendingCount > 0 ? `SINCRONIZANDO (${pendingCount})` : 'SISTEMA ONLINE') : 'TRABAJANDO OFFLINE'}
            </span>
          </div>

          <div className="text-right hide-mobile">
            <div className="text-sm font-bold text-zinc-200">{user?.name}</div>
            <div className="text-[10px] text-zinc-500 uppercase font-black">{time}</div>
          </div>
          <button onClick={() => { clearSession(); router.push('/login') }} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors">
            🚪
          </button>
        </div>
      </header>

      {/* CAJA CERRADA BLOCKER */}
      {!activeRegister && !catalogLoading && (user?.role === 'CASHIER' || user?.role === 'SUPERVISOR') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100, 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center'
        }} className="animate-fadeIn">
          <div style={{ maxWidth: '400px', background: 'var(--c-surface-1)', padding: '40px', borderRadius: '24px', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Caja Cerrada</h2>
            <p style={{ color: 'var(--c-text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
              Para poder realizar ventas y asegurar la integridad financiera, debes <strong>Abrir Caja</strong> primero.
              Esto evita descuadres y asegura la integridad de la sucursal.
            </p>
            <a href="/cash-register" className="btn-green" style={{ padding: '16px 32px', width: '100%', fontSize: '16px', display: 'inline-block', textDecoration: 'none', borderRadius: '12px' }}>
              🚀 Abrir Caja Ahora
            </a>
          </div>
        </div>
      )}

      <div className="pos-layout">

        {/* ── LEFT: Product Catalog ── */}
        <div className="pos-catalog">

          {/* Search + Categories */}
          <div className="p-3 md:p-4 border-b border-zinc-900 shrink-0">
            <input
              ref={searchRef}
              id="pos-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Buscar producto..."
              className="input-dark w-full p-2.5 text-sm mb-3"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {catList.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-all ${
                    category === c.id ? 'bg-green-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 grid-responsive align-content-start">
            {catalogLoading ? (
              <div className="col-span-full text-center py-12 text-zinc-500">
                <div className="text-3xl mb-3 animate-pulse">⏳</div>
                Cargando catálogo...
              </div>
            ) : filtered.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="glass rounded-xl p-4 cursor-pointer text-center flex flex-col items-center gap-2 transition-all hover:border-green-500 hover:bg-zinc-900/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/10 group relative"
                style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid var(--c-border)' }}
              >
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.isActive ? '#22c55e' : '#ef4444', boxShadow: p.isActive ? '0 0 6px #22c55e' : 'none' }}></div>
                </div>
                <span className="text-3xl group-hover:scale-110 transition-transform">{p.category?.emoji ?? '📦'}</span>
                <span className="text-xs font-bold text-white line-clamp-2 leading-tight">{p.name}</span>
                <span className="text-[10px] text-zinc-500 line-clamp-1 h-3">{p.description ?? ''}</span>
                <span className="text-sm font-black text-green-500 mt-1">{fmt(p.price)}</span>
              </button>
            ))}
            {!catalogLoading && filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--c-text-muted)' }}>
                {products.length === 0 ? '⚠️ No hay productos en el catálogo. Agrégalos desde el panel de administración.' : 'No se encontraron productos'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className={`pos-cart ${mobileCartOpen ? 'active' : ''}`}>
          
          {/* Cart Header (Click to toggle on mobile) */}
          <div 
            className="pos-cart-header shrink-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-900/50"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🛒</span>
              <span className="font-bold text-sm text-white">Carrito ({cart.length})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-green-500">{fmt(subtotal)}</span>
              <span className="show-mobile text-zinc-500">{mobileCartOpen ? '▼' : '▲'}</span>
            </div>
          </div>

          {/* Customer Search (Sticky at top of cart) */}
          <div className="p-3 border-b border-zinc-900 shrink-0">
            <input
              id="customer-phone"
              value={phoneQuery}
              onChange={e => setPhoneQuery(e.target.value.replace(/\D/g, ''))}
              placeholder="📱 Teléfono del cliente..."
              className="input-dark w-full p-2.5 text-sm"
              maxLength={10}
            />
            {customerLoading && (
              <div className="mt-2 text-xs text-zinc-500 animate-pulse">Buscando...</div>
            )}
            {!customerLoading && customer && (
              <>
                <div className="mt-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex justify-between items-center animate-fadeIn">
                  <div>
                    <div className="text-sm font-bold text-white">{customer.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      ⭐ {customer.points.toFixed(0)} pts · {customer.totalVisits} visitas
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-800 text-zinc-300`}>
                    {customer.level}
                  </span>
                </div>
                <button onClick={handleOpenSubModal} className="btn-ghost w-full mt-2 py-1.5 text-[10px] text-green-500 border-green-500/30">
                  ⭐ Gestionar Suscripción (Plan Recovery)
                </button>
              </>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <div className="text-4xl mb-3 opacity-20">🛒</div>
                <div className="text-sm">El carrito está vacío</div>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="flex gap-3 items-center group">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-xl shrink-0 group-hover:bg-zinc-800 transition-colors">
                  {item.category?.emoji ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.name}</div>
                  <div className="text-xs text-zinc-500">{fmt(item.price)} c/u</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800">-</button>
                  <span className="text-sm font-bold w-4 text-center text-white">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800">+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Footer / Checkout */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-4 shrink-0">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-green-500">
                  <span>Descuento (Nivel)</span>
                  <span>−{fmt(discount)}</span>
                </div>
              )}
              {redeemed > 0 && (
                <div className="flex justify-between text-xs text-orange-500">
                  <span>Puntos redimidos</span>
                  <span>−{fmt(redeemed)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-zinc-900">
                <span className="text-base font-bold text-white">Total</span>
                <span className="text-xl font-black text-green-500">{fmt(finalTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  title={m.label}
                  className={`py-3 rounded-lg text-lg flex items-center justify-center transition-all ${
                    paymentMethod === m.id ? 'bg-green-500 border-none scale-105 shadow-lg shadow-green-500/20' : 'bg-zinc-900 border border-zinc-800 grayscale opacity-60'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowPayModal(true)}
              className="btn-green w-full py-4 text-base tracking-wide"
              disabled={cart.length === 0}
            >
              <span>💳 COBRAR {fmt(finalTotal)}</span>
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
                  {redeemed > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#f59e0b', paddingTop: '4px' }}>
                      <span>Pago con Puntos ({redeemed})</span><span>−{fmt(redeemed)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)', paddingTop: '12px', marginTop: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>Total a pagar</span>
                    <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--c-green)' }}>{fmt(finalTotal)}</span>
                  </div>
                </div>

                {customer && customer.points > 0 && (
                  <div style={{ marginBottom: '20px', background: '#f59e0b10', padding: '12px', borderRadius: '12px', border: '1px solid #f59e0b30' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>🌟 Tienes {customer.points} puntos</span>
                      <span style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>1 pt = $1</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input value={pointsToRedeem} onChange={e => setPointsToRedeem(e.target.value.replace(/\D/g, ''))}
                        placeholder="0" type="number" className="input-dark" max={Math.min(customer.points, subtotal - discount)}
                        style={{ width: '100%', padding: '8px 12px' }} />
                      <button onClick={() => setPointsToRedeem(Math.min(customer.points, subtotal - discount).toString())}
                              className="btn-ghost" style={{ padding: '8px 12px', color: '#f59e0b' }}>
                        Usar Max
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CASH' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Efectivo recibido
                    </label>
                    {/* Quick denomination buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Exacto', val: Math.ceil(finalTotal / 10) * 10 },
                        { label: '$50', val: 50 },
                        { label: '$100', val: 100 },
                        { label: '$200', val: 200 },
                        { label: '$500', val: 500 },
                      ].filter(b => b.val >= finalTotal || b.label === 'Exacto').map(b => (
                        <button
                          key={b.label}
                          onClick={() => setCashGiven(b.val.toString())}
                          style={{
                            padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                            cursor: 'pointer', border: '1px solid var(--c-border)',
                            background: cashGiven === b.val.toString() ? 'var(--c-green)' : 'var(--c-surface-2)',
                            color: cashGiven === b.val.toString() ? '#000' : 'var(--c-text)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {b.label === 'Exacto' ? `Exacto ${fmt(b.val)}` : b.label}
                        </button>
                      ))}
                    </div>
                    <input value={cashGiven} onChange={e => setCashGiven(e.target.value.replace(/\D/g, ''))}
                      placeholder="O escribe la cantidad..." type="number" className="input-dark"
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

      {/* Subscription Modal */}
      {showSubModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Planes Recovery</h3>
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Suscribe a <strong>{customer?.name}</strong> para activar beneficios recurrentes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {plans.map(p => (
                <div key={p.id} style={{ 
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: '12px', padding: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--c-green)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>
                      ${p.price} / {p.intervalDays} días
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSubscribe(p.id)} className="btn-green" style={{ padding: '6px 12px', fontSize: '11px' }} disabled={submittingSub}>
                      Manual
                    </button>
                    <button onClick={() => handleSubscribeStripe(p.id)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', border: '1px solid #6366f1' }} disabled={submittingSub}>
                      Tarjeta
                    </button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && <div style={{ textAlign: 'center', color: 'var(--c-text-muted)' }}>No hay planes disponibles.</div>}
            </div>

            <button onClick={() => setShowSubModal(false)} className="btn-ghost" style={{ width: '100%', padding: '12px' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL / TICKET PREVIEW */}
      {showSuccess && lastOrder && (
        <div className="modal-overlay no-print">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>¡Venta Exitosa!</h2>
              <div style={{ fontSize: '12px', color: '#bbf7d0', marginTop: '4px', fontFamily: 'monospace' }}>{lastOrder.orderNumber}</div>
            </div>

            {/* Ticket Preview */}
            <div style={{ padding: '20px', background: 'var(--c-surface-1)', maxHeight: '380px', overflowY: 'auto' }}>
              {lastOrder.customer && (
                <div style={{ padding: '10px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', marginBottom: '12px', fontSize: '12px' }}>
                  👤 <strong>{lastOrder.customer.name}</strong> · +{lastOrder.pointsEarned || 0} puntos Natural
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {lastOrder.items?.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--c-text-muted)' }}>{item.quantity}× {item.product?.name || 'Producto'}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed var(--c-border)', paddingTop: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '4px' }}>
                  <span>Subtotal</span><span>{fmt(lastOrder.subtotal)}</span>
                </div>
                {(lastOrder.discountAmount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f59e0b', marginBottom: '4px' }}>
                    <span>Descuento 5%</span><span>-{fmt(lastOrder.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, color: 'var(--c-green)', marginTop: '6px' }}>
                  <span>TOTAL</span><span>{fmt(lastOrder.total)}</span>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>
                {lastOrder.payments?.map((p: any, i: number) => (
                  <div key={i}>💳 {p.method}: {fmt(p.amount)}</div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--c-surface-1)', borderTop: '1px solid var(--c-border)' }}>
              <button onClick={async () => {
                const ok = await printTicketWebUSB(lastOrder);
                if (!ok) window.print(); // Fallback
              }} className="btn-green" style={{ padding: '14px', fontSize: '15px' }}>
                ⚡ Imprimir Directo (USB)
              </button>
              <button onClick={() => window.print()} className="btn-ghost" style={{ padding: '10px', fontSize: '13px' }}>
                🖨️ Imprimir PDF (Navegador)
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSuccess(false)} className="btn-ghost" style={{ flex: 1, padding: '12px' }}>
                  Nueva Venta
                </button>
                <a href="/ventas" style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '10px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
                  📋 Ver Ventas
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TICKET */}
      {lastOrder && (
        <div id="printable-ticket" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0', fontSize: '18px' }}>NATURAL BY NUTRIT</h2>
            <p style={{ margin: '0', fontSize: '10px' }}>Sucursal {lastOrder.branch?.name || 'Centro'}</p>
            <p style={{ margin: '0', fontSize: '10px' }}>{new Date(lastOrder.createdAt).toLocaleString()}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
          
          <div style={{ marginBottom: '10px' }}>
            <p style={{ margin: '0', fontWeight: 'bold' }}>Folio: {lastOrder.orderNumber}</p>
            <p style={{ margin: '0' }}>Cajero: {lastOrder.cashier?.name || 'User'}</p>
            {lastOrder.customer && <p style={{ margin: '0' }}>Cliente: {lastOrder.customer.name}</p>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left' }}>Cant</th>
                <th style={{ textAlign: 'left' }}>Producto</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lastOrder.items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td>{item.quantity}</td>
                  <td>{item.product?.name}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0' }}>Subtotal: {fmt(lastOrder.subtotal)}</p>
            {lastOrder.discountAmount > 0 && <p style={{ margin: '0' }}>Descuento: -{fmt(lastOrder.discountAmount)}</p>}
            <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px' }}>TOTAL: {fmt(lastOrder.total)}</p>
          </div>

          <div style={{ marginTop: '10px' }}>
            <p style={{ margin: '0', fontWeight: 'bold' }}>Pagos:</p>
            {lastOrder.payments.map((p: any, idx: number) => (
              <p key={idx} style={{ margin: '0', fontSize: '10px' }}>• {p.method}: {fmt(p.amount)}</p>
            ))}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9px' }}>
            <p style={{ margin: '0' }}>¡Gracias por tu visita!</p>
            <p style={{ margin: '0' }}>www.naturalbynutrit.com</p>
          </div>
        </div>
      )}

      {/* TOASTS CONTAINER */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999 }}>
        {toasts.map((msg, i) => (
          <div key={i} style={{
            background: 'var(--c-surface-1)', border: '1px solid #eab308', borderLeft: '4px solid #eab308',
            color: 'var(--c-text)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease', display: 'flex', gap: '10px', alignItems: 'center'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{msg}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

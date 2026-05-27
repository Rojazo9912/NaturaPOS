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
  apiGetPendingOrdersCount,
  apiCreateCustomer,
  apiGetIngredients, apiAdjustInventory,
  apiCreateCashMovement,
  type Product, type Category, type Customer,
} from '@/lib/api'
import { printTicketWebUSB } from '@/lib/printer'
import { getSocket } from '@/lib/socket'
import { useBarcodeScanner, playScanSound } from '@/lib/useBarcodeScanner'
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

  const [mounted, setMounted] = useState(false)
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

  // ── Registro Rápido de Clientes en POS ──
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerAllergies, setNewCustomerAllergies] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const handleQuickRegisterCustomer = async () => {
    if (!newCustomerName || phoneQuery.length !== 10) return
    const token = getToken()
    if (!token) return
    
    setCreatingCustomer(true)
    try {
      const created = await apiCreateCustomer(token, {
        name: newCustomerName,
        phone: phoneQuery,
        email: newCustomerEmail || undefined,
        allergies: newCustomerAllergies || undefined
      })
      setCustomer(created)
      addToast(`🎉 Cliente ${created.name} registrado con éxito!`)
      setNewCustomerName('')
      setNewCustomerEmail('')
      setNewCustomerAllergies('')
    } catch (err: any) {
      addToast(`❌ Error: ${err.message || 'No se pudo registrar cliente'}`)
    } finally {
      setCreatingCustomer(false)
    }
  }

  // ── Módulo de Mermas Rápidas ──
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [wasteType, setWasteType] = useState<'PRODUCT' | 'INGREDIENT'>('PRODUCT')
  const [wasteProductId, setWasteProductId] = useState('')
  const [wasteIngredientId, setWasteIngredientId] = useState('')
  const [wasteQty, setWasteQty] = useState('')
  const [wasteReason, setWasteReason] = useState('Error de preparación')
  const [wasteNotes, setWasteNotes] = useState('')
  const [ingredients, setIngredients] = useState<any[]>([])
  const [submittingWaste, setSubmittingWaste] = useState(false)

  useEffect(() => {
    if (showWasteModal && ingredients.length === 0) {
      const token = getToken()
      if (token) {
        apiGetIngredients(token).then(setIngredients).catch(console.error)
      }
    }
  }, [showWasteModal, ingredients.length])

  const handleSaveWaste = async () => {
    const qtyNum = Number(wasteQty)
    if (!qtyNum || qtyNum <= 0) {
      addToast('❌ Ingresa una cantidad válida mayor a cero.')
      return
    }
    if (wasteType === 'PRODUCT' && !wasteProductId) {
      addToast('❌ Selecciona un producto del catálogo.')
      return
    }
    if (wasteType === 'INGREDIENT' && !wasteIngredientId) {
      addToast('❌ Selecciona un insumo.')
      return
    }

    const token = getToken()
    if (!token) return

    setSubmittingWaste(true)
    try {
      const adjustmentData = {
        productId: wasteType === 'PRODUCT' ? wasteProductId : undefined,
        ingredientId: wasteType === 'INGREDIENT' ? wasteIngredientId : undefined,
        quantity: -Math.abs(qtyNum),
        reason: `${wasteReason}${wasteNotes ? ' - ' + wasteNotes : ''}`,
        type: 'WASTE'
      }

      await apiAdjustInventory(token, adjustmentData)
      addToast('🗑️ Merma registrada y descontada del inventario con éxito.')
      
      // Reset state and close
      setWasteQty('')
      setWasteProductId('')
      setWasteIngredientId('')
      setWasteNotes('')
      setShowWasteModal(false)
    } catch (err: any) {
      addToast(`❌ Error al registrar merma: ${err.message || 'Error desconocido'}`)
    } finally {
      setSubmittingWaste(false)
    }
  }

  // ── Módulo de Movimientos de Caja (Aportes/Retiros) ──
  const [showCashMovementModal, setShowCashMovementModal] = useState(false)
  const [cashMovementType, setCashMovementType] = useState<'IN' | 'OUT'>('IN')
  const [cashMovementAmount, setCashMovementAmount] = useState('')
  const [cashMovementReason, setCashMovementReason] = useState('Aporte de cambio')
  const [cashMovementNotes, setCashMovementNotes] = useState('')
  const [submittingCashMovement, setSubmittingCashMovement] = useState(false)

  const handleSaveCashMovement = async () => {
    const amountNum = Number(cashMovementAmount)
    if (!amountNum || amountNum <= 0) {
      addToast('❌ Ingresa un monto válido mayor a cero.')
      return
    }

    const token = getToken()
    if (!token) return

    setSubmittingCashMovement(true)
    try {
      await apiCreateCashMovement(token, {
        type: cashMovementType,
        amount: amountNum,
        reason: `${cashMovementReason}${cashMovementNotes ? ' - ' + cashMovementNotes : ''}`
      })

      addToast(
        cashMovementType === 'IN'
          ? '💵 Entrada de efectivo (Aporte) registrada con éxito.'
          : '💸 Salida de efectivo (Retiro) registrada con éxito.'
      )

      // Reset & close
      setCashMovementAmount('')
      setCashMovementNotes('')
      setShowCashMovementModal(false)
    } catch (err: any) {
      addToast(`❌ Error al registrar movimiento: ${err.message || 'Error desconocido'}`)
    } finally {
      setSubmittingCashMovement(false)
    }
  }

  // Monitor connectivity
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    
    // Check pending orders from IndexedDB
    const checkPending = async () => {
      try {
        const count = await apiGetPendingOrdersCount()
        setPendingCount(count)
      } catch {
        setPendingCount(0)
      }
    }
    checkPending() // Carga inicial inmediata
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
    setMounted(true)
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

  // ── CRM Clínico: Detección de Alérgenos Cruzados ──
  const getActiveAllergenWarnings = useCallback(() => {
    if (!customer || !customer.allergies || cart.length === 0) return []
    
    const customerAllergiesSet = new Set(
      customer.allergies
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    )

    const warnings: Array<{ productName: string; allergen: string }> = []

    cart.forEach(item => {
      if (item.allergens) {
        const itemAllergens = item.allergens
          .toLowerCase()
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)

        itemAllergens.forEach(allergen => {
          if (customerAllergiesSet.has(allergen)) {
            warnings.push({ productName: item.name, allergen })
          }
        })
      }
    })

    return warnings
  }, [customer, cart])

  // ── IA Predictiva: Algoritmo de Sugerencia de Venta (Upselling) ──
  const upsellRecommendations = (() => {
    if (cart.length === 0 || products.length === 0) return []
    const cartIds = new Set(cart.map(item => item.id))
    
    // Filtrar productos activos y que NO estén ya en el carrito
    const candidates = products.filter(p => !cartIds.has(p.id) && p.isActive)
    
    // Regla de Afinidad Wellness: priorizar extras, shots, proteínas, colágenos (con soporte robusto de acentos)
    const extras = candidates.filter(p => 
      /shot|extra|prote[íi]n|col[áa]gen|adici[óo]n|adici[óo]|jengibre|maca|cacao|espirul|suplement/i.test(p.name)
    )
    
    if (extras.length > 0) {
      return extras.slice(0, 2)
    }
    
    // Si no hay extras específicos en catálogo, sugerir los 2 productos más económicos (snacks rápidos o aguas)
    return candidates.sort((a, b) => a.price - b.price).slice(0, 2)
  })()

  const handlePay = useCallback(async () => {
    if (paying || cart.length === 0) return
    const token = getToken()
    if (!token) return
    
    if (!activeRegister) {
      setPayError('❌ Debes ABRIR LA CAJA antes de poder realizar ventas.')
      return
    }

    if (paymentMethod === 'WALLET') {
      if (!customer) {
        setPayError('❌ Debes seleccionar un cliente registrado para pagar con Wallet/Monedero.')
        return
      }
      if ((customer.walletBalance || 0) < finalTotal) {
        const deficit = finalTotal - (customer.walletBalance || 0)
        setPayError(`❌ Saldo insuficiente en Wallet. Saldo actual: $${(customer.walletBalance || 0).toFixed(2)} MXN (Faltan $${deficit.toFixed(2)} MXN).`)
        return
      }
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
        if (canPay && (cart || []).length > 0) handlePay()
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

  const catList = [ALL_CAT, ...(Array.isArray(categories) ? categories : []).map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '📦' }))]

  const filtered = (Array.isArray(products) ? products : []).filter(p =>
    p.isActive &&
    (category === 'all' || p.categoryId === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.barcode === search)
  )

  // Autodetect Barcode Scan (Foco en buscador)
  useEffect(() => {
    if (search.length >= 8) {
      const prod = products.find(p => p.barcode === search)
      if (prod) {
        setCart(prev => {
          const exists = prev.find(i => i.id === prod.id)
          if (exists) return prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
          return [...prev, { ...prod, qty: 1 }]
        })
        playScanSound()
        addToast(`🏷️ Producto escaneado: ${prod.name}`)
        setSearch('')
      }
    }
  }, [search, products])

  // Escaneo Láser Físico Global (Omnipresente, sin foco requerido)
  useBarcodeScanner(useCallback((barcode) => {
    const prod = products.find(p => p.barcode === barcode || p.sku === barcode)
    if (prod) {
      addToCart(prod)
      playScanSound()
      addToast(`🏷️ Producto escaneado: ${prod.name}`)
    } else {
      addToast(`⚠️ Código de barras "${barcode}" no registrado en el sistema.`)
    }
  }, [products, addToCart]))

  const handleOpenSubModal = async () => {
    const token = getToken()
    if (!token) return
    try {
      const p = await apiGetSubscriptionPlans(token)
      setPlans(p)
      setShowSubModal(true)
    } catch (e) {
      addToast('❌ Error al cargar planes de suscripción')
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!customer) return
    const token = getToken()
    if (!token) return
    setSubmittingSub(true)
    try {
      await apiSubscribeCustomer(token, customer.id, planId)
      addToast('🎉 ¡Cliente suscrito con éxito!')
      setShowSubModal(false)
    } catch (e) {
      addToast('❌ Error al suscribir cliente')
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
      addToast('❌ Error al iniciar pago con Stripe')
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
            <button onClick={() => setShowWasteModal(true)} className="text-base md:text-xs text-zinc-400 no-underline hover:text-red-500 bg-transparent border-none cursor-pointer flex items-center p-0" style={{ font: 'inherit' }} title="Registrar Merma">🗑️<span className="hide-mobile ml-1">Merma</span></button>
            <button onClick={() => setShowCashMovementModal(true)} className="text-base md:text-xs text-zinc-400 no-underline hover:text-green-500 bg-transparent border-none cursor-pointer flex items-center p-0" style={{ font: 'inherit' }} title="Movimiento de Efectivo">💸<span className="hide-mobile ml-1">Movimiento</span></button>
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
            <div className="text-sm font-bold text-zinc-200">{mounted ? user?.name : '...'}</div>
            <div className="text-[10px] text-zinc-500 uppercase font-black">{mounted ? time : '--:--'}</div>
          </div>
          <button onClick={() => { clearSession(); router.push('/login') }} className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors">
            {mounted ? '🚪' : ''}
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
              {Array.isArray(catList) && catList.map(c => (
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
            ) : (Array.isArray(filtered) ? filtered : []).map(p => (
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
                {(() => {
                  const spent = customer.totalSpent || 0;
                  const lvl = (customer.level || 'VERDE').toUpperCase();
                  let tierName = 'VERDE';
                  let nextTier = 'GOLD';
                  let target = 1000;
                  let gradient = 'from-green-500 to-emerald-400';
                  let glowColor = 'rgba(34,197,94,0.4)';
                  let badgeClass = 'bg-green-500/10 text-green-400 border border-green-500/30';
                  
                  if (lvl === 'GOLD') {
                    tierName = 'GOLD';
                    nextTier = 'ELITE';
                    target = 3000;
                    gradient = 'from-amber-500 to-orange-400';
                    glowColor = 'rgba(245,158,11,0.4)';
                    badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
                  } else if (lvl === 'ELITE') {
                    tierName = 'ELITE';
                    nextTier = 'LEGEND';
                    target = 7000;
                    gradient = 'from-violet-600 to-purple-400';
                    glowColor = 'rgba(139,92,246,0.4)';
                    badgeClass = 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
                  } else if (lvl === 'LEGEND') {
                    tierName = 'LEGEND';
                    nextTier = '';
                    target = 0;
                    gradient = 'from-pink-500 to-rose-400';
                    glowColor = 'rgba(236,72,153,0.4)';
                    badgeClass = 'bg-pink-500/10 text-pink-400 border border-pink-500/30';
                  }

                  const progress = target > 0 ? Math.min(100, Math.floor((spent / target) * 100)) : 100;
                  const remaining = target > spent ? (target - spent) : 0;

                  return (
                    <div className="mt-3 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 backdrop-blur-md animate-fadeIn shadow-lg shadow-black/40 space-y-4">
                      {/* Cabecera del Cliente */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-black text-white leading-tight">{customer.name}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {customer.phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3')}
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeClass} animate-pulse`}>
                          👑 {tierName}
                        </span>
                      </div>

                      {/* Monedero Digital / Wallet */}
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center transition-all duration-300 hover:border-green-500/30 hover:bg-zinc-900/80 group">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-lg border border-green-500/20 group-hover:scale-105 group-hover:bg-green-500/20 transition-all">
                            👛
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Saldo Wallet</div>
                            <div className="text-sm font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">
                              ${(customer.walletBalance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-zinc-500">Puntos Naturales</div>
                          <div className="text-xs font-bold text-white">⭐ {customer.points.toFixed(0)} pts</div>
                        </div>
                      </div>

                      {/* Gamificación y Progreso */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-400 font-bold">Progreso de Nivel</span>
                          <span className="text-zinc-500 font-mono">
                            ${spent.toFixed(0)} {target > 0 ? `/ $${target}` : ''}
                          </span>
                        </div>
                        
                        {/* Apple-style Progress Bar */}
                        <div className="relative h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out`}
                            style={{
                              width: `${progress}%`,
                              boxShadow: `0 0 8px ${glowColor}`
                            }}
                          />
                        </div>

                        {/* Texto de Nivel Siguiente */}
                        {target > 0 ? (
                          <div className="text-[9px] text-zinc-400 leading-tight">
                            Te faltan <span className="text-amber-400 font-black">${remaining.toLocaleString('es-MX')} MXN</span> de consumo acumulado para ascender a <span className="text-white font-bold">{nextTier}</span>.
                          </div>
                        ) : (
                          <div className="text-[9px] text-pink-400 font-black leading-tight flex items-center gap-1">
                            <span>✨</span> ¡Felicidades! Has alcanzado el nivel máximo LEGEND.
                          </div>
                        )}
                      </div>

                      {/* Visitas & Estadísticas Rápidas */}
                      <div className="flex justify-between items-center text-[9px] text-zinc-500 border-t border-zinc-900 pt-3">
                        <div>
                          Visitas totales: <span className="text-zinc-300 font-bold">{customer.totalVisits}</span>
                        </div>
                        <div>
                          Gasto histórico: <span className="text-zinc-300 font-bold">${spent.toLocaleString('es-MX')}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <button onClick={handleOpenSubModal} className="btn-ghost w-full mt-2 py-1.5 text-[10px] text-green-500 border-green-500/30">
                  ⭐ Gestionar Suscripción (Plan Recovery)
                </button>

                {/* Visualización de Alergias Registradas */}
                {customer.allergies && (
                  <div className="mt-2 text-[10px] font-semibold text-zinc-400 flex flex-wrap gap-1 items-center">
                    <span>⚠️ Alergias:</span>
                    {customer.allergies.split(',').map((alg, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900 text-red-400 font-bold uppercase text-[9px]">
                        {alg.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Banner de Conflictos de Alérgenos */}
                {getActiveAllergenWarnings().length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-500/40 space-y-2 animate-pulse shadow-lg shadow-red-950/20">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider">
                      <span>🚨</span>
                      <span>Conflicto de Alérgenos</span>
                    </div>
                    <div className="space-y-1">
                      {getActiveAllergenWarnings().map((w, idx) => (
                        <div key={idx} className="text-[11px] text-red-200 leading-tight">
                          • <strong className="text-white">{w.productName}</strong> contiene <span className="underline font-black text-red-300 uppercase">{w.allergen}</span>.
                        </div>
                      ))}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-bold leading-normal pt-1 border-t border-red-950">
                      * Por favor, alerta al personal de preparación para evitar contaminación cruzada.
                    </div>
                  </div>
                )}
              </>
            )}

            {!customerLoading && !customer && phoneQuery.length === 10 && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-900/50 border border-dashed border-zinc-800 animate-fadeIn space-y-3">
                <div className="text-[11px] text-zinc-400">📱 Cliente nuevo no registrado. ¿Deseas darlo de alta?</div>
                <div className="space-y-2">
                  <input
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="Nombre completo..."
                    className="input-dark w-full p-2 text-xs"
                  />
                  <input
                    value={newCustomerEmail}
                    onChange={e => setNewCustomerEmail(e.target.value)}
                    placeholder="Correo (opcional)..."
                    className="input-dark w-full p-2 text-xs"
                    type="email"
                  />
                  <input
                    value={newCustomerAllergies}
                    onChange={e => setNewCustomerAllergies(e.target.value)}
                    placeholder="Alergias (ej. Lactosa, Cacahuate)..."
                    className="input-dark w-full p-2 text-xs"
                  />
                  <button
                    onClick={handleQuickRegisterCustomer}
                    className="btn-green w-full py-1.5 text-xs font-bold"
                    disabled={creatingCustomer || !newCustomerName}
                  >
                    {creatingCustomer ? 'Registrando...' : '✅ Registrar y Seleccionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <div className="text-4xl mb-3 opacity-20">🛒</div>
                <div className="text-sm">El carrito está vacío</div>
              </div>
            ) : (cart || []).map(item => {
              const itemAllergensList = item.allergens ? item.allergens.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : []
              const customerAllergiesList = customer?.allergies ? customer.allergies.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : []
              const conflictingAllergen = itemAllergensList.find(alg => customerAllergiesList.includes(alg))

              return (
                <div 
                  key={item.id} 
                  className={`flex gap-3 items-center group p-1.5 rounded-lg border transition-all ${
                    conflictingAllergen 
                      ? 'bg-red-950/20 border-red-500/30 shadow-md shadow-red-950/20' 
                      : 'border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 group-hover:bg-zinc-800 transition-colors ${
                    conflictingAllergen ? 'bg-red-950 border border-red-900 text-red-500' : 'bg-zinc-900'
                  }`}>
                    {item.category?.emoji ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{item.name}</div>
                    <div className="text-xs text-zinc-500">
                      {fmt(item.price)} c/u
                      {conflictingAllergen && (
                        <span className="block text-[10px] text-red-400 font-extrabold uppercase mt-0.5 animate-pulse">
                          ⚠️ Contiene: {conflictingAllergen}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800">-</button>
                    <span className="text-sm font-bold w-4 text-center text-white">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800">+</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* IA Predictiva: Upselling Panel */}
          {cart.length > 0 && upsellRecommendations.length > 0 && (
            <div style={{
              margin: '10px 16px', padding: '12px 14px',
              background: 'rgba(34,197,94,0.03)',
              border: '1px dashed rgba(34,197,94,0.2)',
              borderRadius: '12px',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>✨</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(34,197,94,0.85)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Natura IA: Sugerencia de Venta
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upsellRecommendations.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '14px' }}>{p.category?.emoji || '🌿'}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      style={{
                        padding: '4px 8px', borderRadius: '6px',
                        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e', fontSize: '10px', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#22c55e';
                        e.currentTarget.style.color = '#000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                        e.currentTarget.style.color = '#22c55e';
                      }}
                    >
                      + {fmt(p.price)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {(PAYMENT_METHODS || []).map(m => (
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

      {/* ── Cash Movement Modal ── */}
      {showCashMovementModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Movimiento de Efectivo 💸</h3>
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Registra entradas de cambio o retiros de efectivo realizados en el turno de caja.
            </p>

            {/* Cash Movement Type Selector */}
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => { setCashMovementType('IN'); setCashMovementReason('Aporte de cambio') }} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  cashMovementType === 'IN' ? 'bg-green-500 text-black border-none' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                💵 Entrada / Aporte
              </button>
              <button 
                onClick={() => { setCashMovementType('OUT'); setCashMovementReason('Pago a proveedor') }} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  cashMovementType === 'OUT' ? 'bg-red-500 text-white border-none' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                💸 Salida / Retiro
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Monto de Efectivo ($)
                </label>
                <input 
                  type="number"
                  step="any"
                  value={cashMovementAmount}
                  onChange={e => setCashMovementAmount(e.target.value)}
                  placeholder="$0.00"
                  className="input-dark w-full p-2.5 text-sm"
                  style={{ fontSize: '18px', fontWeight: 700, color: cashMovementType === 'IN' ? '#22c55e' : '#ef4444' }}
                />
              </div>

              {/* Reason */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Concepto / Motivo
                </label>
                {cashMovementType === 'IN' ? (
                  <select 
                    value={cashMovementReason} 
                    onChange={e => setCashMovementReason(e.target.value)}
                    className="input-dark w-full p-2.5 text-sm"
                    style={{ background: '#0a0a0a' }}
                  >
                    <option value="Aporte de cambio">💵 Aporte de cambio (Monedas / Billetes)</option>
                    <option value="Fondo inicial extra">💰 Fondo inicial extra</option>
                    <option value="Otro">❓ Otro motivo</option>
                  </select>
                ) : (
                  <select 
                    value={cashMovementReason} 
                    onChange={e => setCashMovementReason(e.target.value)}
                    className="input-dark w-full p-2.5 text-sm"
                    style={{ background: '#0a0a0a' }}
                  >
                    <option value="Pago a proveedor">🍇 Gasto / Pago a proveedor</option>
                    <option value="Compra de insumos de emergencia">🧊 Compra de insumos de emergencia</option>
                    <option value="Retiro de seguridad">🔒 Retiro de seguridad (Parcial)</option>
                    <option value="Otro">❓ Otro motivo</option>
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Detalles Adicionales (Opcional)
                </label>
                <input 
                  type="text"
                  value={cashMovementNotes}
                  onChange={e => setCashMovementNotes(e.target.value)}
                  placeholder="Ej: Proveedor de fresas, cambio para el cajero..."
                  className="input-dark w-full p-2.5 text-sm"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowCashMovementModal(false)} 
                className="btn-ghost"
                style={{ flex: 1, padding: '12px' }} 
                disabled={submittingCashMovement}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveCashMovement} 
                className="btn-green"
                style={{ flex: 2, padding: '12px', background: cashMovementType === 'IN' ? '#22c55e' : '#ef4444', color: cashMovementType === 'IN' ? '#000' : '#fff', border: 'none' }} 
                disabled={submittingCashMovement}
              >
                {submittingCashMovement ? 'Registrando...' : 'Confirmar Movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waste Modal ── */}
      {showWasteModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Registrar Merma / Desperdicio 🗑️</h3>
            <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Registra los insumos o productos desperdiciados para mantener la precisión del inventario.
            </p>

            {/* Waste Type Selector */}
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setWasteType('PRODUCT')} 
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  wasteType === 'PRODUCT' ? 'bg-green-500 text-black border-none' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                📦 Producto Catálogo
              </button>
              <button 
                onClick={() => setWasteType('INGREDIENT')} 
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  wasteType === 'INGREDIENT' ? 'bg-green-500 text-black border-none' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                🌿 Insumo / Ingrediente
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Item Selector */}
              {wasteType === 'PRODUCT' ? (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Seleccionar Producto
                  </label>
                  <select 
                    value={wasteProductId} 
                    onChange={e => setWasteProductId(e.target.value)}
                    className="input-dark w-full p-2.5 text-sm"
                    style={{ background: '#0a0a0a' }}
                  >
                    <option value="">-- Elige un producto --</option>
                    {(products || []).filter(p => p.isActive).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Seleccionar Insumo / Ingrediente
                  </label>
                  <select 
                    value={wasteIngredientId} 
                    onChange={e => setWasteIngredientId(e.target.value)}
                    className="input-dark w-full p-2.5 text-sm"
                    style={{ background: '#0a0a0a' }}
                  >
                    <option value="">-- Elige un insumo --</option>
                    {(ingredients || []).map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Cantidad Desperdiciada
                </label>
                <input 
                  type="number"
                  step="any"
                  value={wasteQty}
                  onChange={e => setWasteQty(e.target.value)}
                  placeholder="Ej: 1 o 0.5"
                  className="input-dark w-full p-2.5 text-sm"
                />
              </div>

              {/* Reason */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Motivo de Merma
                </label>
                <select 
                  value={wasteReason} 
                  onChange={e => setWasteReason(e.target.value)}
                  className="input-dark w-full p-2.5 text-sm"
                  style={{ background: '#0a0a0a' }}
                >
                  <option value="Error de preparación">🥤 Error de preparación</option>
                  <option value="Insumo caducado / dañado">🍎 Insumo caducado / dañado</option>
                  <option value="Merma operativa">⚙️ Merma operativa</option>
                  <option value="Otro">❓ Otro motivo</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--c-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Notas Adicionales (Opcional)
                </label>
                <input 
                  type="text"
                  value={wasteNotes}
                  onChange={e => setWasteNotes(e.target.value)}
                  placeholder="Detalles sobre la merma..."
                  className="input-dark w-full p-2.5 text-sm"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowWasteModal(false)} 
                className="btn-ghost"
                style={{ flex: 1, padding: '12px' }} 
                disabled={submittingWaste}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveWaste} 
                className="btn-green"
                style={{ flex: 2, padding: '12px', background: '#ef4444', color: '#fff', border: 'none' }} 
                disabled={submittingWaste}
              >
                {submittingWaste ? 'Procesando...' : '🗑️ Confirmar Merma'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {(cart || []).map(i => (
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
                if (!ok) {
                  addToast("⚠️ Conexión directa USB no detectada o denegada. Abriendo diálogo del navegador...");
                  window.print(); // Fallback
                }
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
              {lastOrder.items?.map((item: any, idx: number) => (
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
            {lastOrder.payments?.map((p: any, idx: number) => (
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

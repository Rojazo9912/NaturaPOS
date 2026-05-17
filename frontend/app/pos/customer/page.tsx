'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { getUser } from '@/lib/api'

interface CartPayload {
  cart: any[]
  subtotal: number
  discount: number
  total: number
}

const fmt = (n: number) => `$${n.toFixed(2)}`

export default function CustomerDisplay() {
  const router = useRouter()
  const [payload, setPayload] = useState<CartPayload>({ cart: [], subtotal: 0, discount: 0, total: 0 })
  const [orgName, setOrgName] = useState('Natura OS')
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    // Attempt to parse or assume name from somewhere. 
    // Usually user has user.organizationId but we can just say "Welcome"
    setOrgName('Natural by Nutrit')

    const socket = getSocket(user.organizationId)

    socket.on('cart_update', (data: CartPayload) => {
      setPayload({
        cart: data.cart || [],
        subtotal: data.subtotal || 0,
        discount: data.discount || 0,
        total: data.total || 0
      })
    })

    // Listen for new_order (payment success)
    socket.on('new_order', () => {
      setPayload({ cart: [], subtotal: 0, discount: 0, total: 0 })
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
      }, 5000)
    })

    return () => {
      socket.off('cart_update')
      socket.off('new_order')
      disconnectSocket()
    }
  }, [router])

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      
      {/* ── LEFT: Visual / Marketing (60%) ── */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-12 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black z-0"></div>
        
        <div className="z-10 text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-green-500 to-lime-600 flex items-center justify-center text-5xl mb-8 shadow-2xl shadow-green-500/20">🌿</div>
          <h1 className="text-5xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-linear-to-r from-white to-zinc-400">{orgName}</h1>
          <p className="text-xl text-zinc-500 mb-12">Escanea el QR para unirte a nuestro programa de lealtad</p>
          
          <div className="p-4 bg-white rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            {/* Fake QR for UI purposes */}
            <div className="w-48 h-48 bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-400">
              [QR LEALTAD]
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 text-zinc-600 text-sm flex gap-6">
          <span className="flex items-center gap-2">🌱 100% Natural</span>
          <span className="flex items-center gap-2">♻️ Eco-Friendly</span>
          <span className="flex items-center gap-2">💪 Wellness</span>
        </div>
      </div>

      {/* ── RIGHT: Current Order (40%) ── */}
      <div className="w-[400px] xl:w-[500px] bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl relative z-10">
        
        <div className="p-8 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">🛒</span> Tu Orden
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {payload.cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
              <span className="text-7xl mb-6">🍹</span>
              <p className="text-xl font-medium">Esperando productos...</p>
            </div>
          ) : (
            payload.cart.map((item, i) => (
              <div key={i} className="flex items-center gap-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  {item.category?.emoji || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold truncate pr-4">{item.name}</div>
                  <div className="text-zinc-500">x{item.qty}</div>
                </div>
                <div className="text-xl font-medium shrink-0">
                  {fmt(item.price * item.qty)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-zinc-950 border-t border-zinc-800 space-y-4">
          <div className="flex justify-between text-zinc-400 text-lg">
            <span>Subtotal</span>
            <span>{fmt(payload.subtotal)}</span>
          </div>
          {payload.discount > 0 && (
            <div className="flex justify-between text-green-500 text-lg">
              <span>Descuento</span>
              <span>-{fmt(payload.discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-6 border-t border-zinc-800 mt-2">
            <span className="text-2xl font-bold text-zinc-300">Total a Pagar</span>
            <span className="text-5xl font-black text-green-500 tracking-tight">{fmt(payload.total)}</span>
          </div>
        </div>

      </div>

      {showSuccessOverlay && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            background: 'var(--c-surface-1, #081008)',
            border: '1px solid var(--c-border, #1a2e1a)',
            boxShadow: '0 0 50px rgba(34, 197, 94, 0.25)',
            borderRadius: '32px', padding: '60px 40px',
            textAlign: 'center', maxWidth: '480px', width: '90%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px'
          }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #a3e635)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '48px', boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
              animation: 'pulse-green 2s infinite'
            }}>
              🌿
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', margin: 0 }}>
                ¡Muchas Gracias!
              </h2>
              <p style={{ fontSize: '18px', color: '#22c55e', fontWeight: 700, margin: '4px 0 0 0' }}>
                Tu orden ha sido recibida con éxito
              </p>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', maxWidth: '340px', margin: 0 }}>
              Tu smoothie y snacks se están preparando con ingredientes frescos del día. ¡Disfruta tu estilo de vida wellness!
            </p>
            
            <div style={{ fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Natural by Nutrit
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

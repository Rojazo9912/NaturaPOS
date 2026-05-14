'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Hide if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setShow(false); setInstalled(true) })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
      borderRadius: '16px', padding: '16px 20px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      animation: 'slideUp 0.3s ease',
      maxWidth: '360px', width: 'calc(100vw - 40px)',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="Natural OS" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--c-text)' }}>Instalar Natural OS</div>
        <div style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '2px' }}>Acceso rápido sin abrir el navegador</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={handleInstall}
          style={{
            padding: '8px 16px', borderRadius: '10px', background: '#22c55e',
            color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800,
          }}
        >
          Instalar
        </button>
        <button
          onClick={() => setShow(false)}
          style={{
            padding: '6px', background: 'none', border: 'none', color: 'var(--c-text-muted)',
            cursor: 'pointer', fontSize: '11px',
          }}
        >
          No gracias
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiLogin, saveSession, getToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (getToken()) router.replace('/pos')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { access_token, user } = await apiLogin(email, password)
      saveSession(access_token, user)
      router.push('/pos')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[var(--c-bg)]">

      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Animated orbs */}
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          borderRadius: '50%', top: '10%', left: '20%',
          animation: 'orb-float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(163,230,53,0.08) 0%, transparent 70%)',
          borderRadius: '50%', bottom: '20%', right: '10%',
          animation: 'orb-float 12s ease-in-out infinite reverse',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '440px' }}>
          {/* Logo */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '18px', marginBottom: '24px',
            background: 'linear-gradient(135deg, var(--c-green), var(--c-lime-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
          }}>
            🌿
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--c-text)', marginBottom: '12px', lineHeight: 1.2 }}>
            Natural OS
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--c-green)', fontWeight: 600, marginBottom: '16px' }}>
            Natural by Nutrit
          </p>
          <p style={{ fontSize: '15px', color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: '40px' }}>
            El sistema operativo inteligente para negocios wellness modernos.
          </p>

          {/* Feature pills */}
          {['🛒 POS Inteligente', '📊 Dashboard en tiempo real', '🔒 Motor Antifugas', '🎯 CRM Emocional'].map((f) => (
            <div key={f} style={{
              display: 'inline-block', margin: '4px',
              padding: '6px 14px', borderRadius: 'var(--r-full)',
              background: 'var(--c-surface-2)', border: '1px solid var(--c-border)',
              fontSize: '13px', color: 'var(--c-text-secondary)',
            }}>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="w-full lg:w-[440px] flex items-center justify-center p-6 md:p-10 lg:border-l border-[var(--c-border)] bg-[var(--c-surface-1)]">
        <div className="w-full max-w-[400px] animate-fadeIn">
          
          {/* Logo visible solo en móvil */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', marginBottom: '16px',
              background: 'linear-gradient(135deg, var(--c-green), var(--c-lime-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
            }}>
              🌿
            </div>
            <h1 className="text-2xl font-black text-white">Natural OS</h1>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-text)' }} className="text-center lg:text-left">
            Bienvenido de vuelta
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '32px' }} className="text-center lg:text-left">
            Inicia sesión para acceder al sistema
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: '20px',
              color: '#fca5a5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-secondary)', marginBottom: '8px' }}>
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@naturalbynutrit.com"
                required
                className="input-dark"
                style={{ width: '100%', padding: '12px 16px', fontSize: '15px' }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-secondary)', marginBottom: '8px' }}>
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-dark"
                style={{ width: '100%', padding: '12px 16px', fontSize: '15px' }}
              />
            </div>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-green"
              style={{
                width: '100%', padding: '14px', fontSize: '16px',
                marginTop: '8px', borderRadius: 'var(--r-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
                  }} />
                  Iniciando sesión...
                </>
              ) : '🌿 Iniciar Sesión'}
            </button>
          </form>

          {/* Footer */}
          <p style={{ marginTop: '32px', fontSize: '12px', color: 'var(--c-text-dim)', textAlign: 'center' }}>
            Natural OS v1.0 · Natural by Nutrit
          </p>
        </div>
      </div>
    </div>
  )
}

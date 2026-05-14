'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getUser, clearSession, apiGetProfile, apiChangePassword } from '@/lib/api'

const ROLE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  CASHIER:    { label: 'Cajero',        color: '#6366f1', emoji: '🧾' },
  SUPERVISOR: { label: 'Supervisor',    color: '#f59e0b', emoji: '👁️' },
  MANAGER:    { label: 'Gerente',       color: '#8b5cf6', emoji: '📊' },
  ADMIN:      { label: 'Administrador', color: '#ef4444', emoji: '⚙️' },
  OWNER:      { label: 'Propietario',   color: '#22c55e', emoji: '👑' },
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [changingPw, setChangingPw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.replace('/login'); return }
    apiGetProfile(token)
      .then(setProfile)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  const role = ROLE_LABELS[profile?.role] ?? { label: profile?.role, color: '#aaa', emoji: '👤' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--c-text-muted)', fontSize: '14px' }}>⏳ Cargando perfil...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'inherit', padding: '40px 20px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Back nav */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>← Dashboard</a>
          <span style={{ color: 'var(--c-border)' }}>|</span>
          <a href="/admin" style={{ fontSize: '13px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>Admin</a>
          <span style={{ color: 'var(--c-border)' }}>|</span>
          <a href="/pos" style={{ fontSize: '13px', color: 'var(--c-text-muted)', textDecoration: 'none' }}>POS</a>
        </div>

        {/* Profile Card */}
        <div style={{
          background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
          borderRadius: '24px', padding: '36px', marginBottom: '20px',
        }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${role.color}33, ${role.color}66)`,
              border: `2px solid ${role.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', flexShrink: 0,
            }}>
              {role.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>
                {profile?.name}
              </h1>
              <div style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginTop: '4px' }}>
                {profile?.email}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px',
                background: `${role.color}20`, color: role.color,
              }}>
                {role.emoji} {role.label}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Organización', value: profile?.organization?.name || '—' },
              { label: 'Plan', value: profile?.organization?.plan || '—' },
              { label: 'Sucursal', value: profile?.branch?.name || 'Corporativo' },
              { label: 'Teléfono', value: profile?.phone || '—' },
              { label: 'Miembro desde', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' }) : '—' },
              { label: 'Risk Score', value: profile?.riskScore !== undefined ? `${profile.riskScore}/100` : '—' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--c-surface-2)', borderRadius: '12px', padding: '14px 16px',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--c-text)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div style={{
          background: 'var(--c-surface-1)', border: '1px solid var(--c-border)',
          borderRadius: '20px', padding: '28px', marginBottom: '20px',
        }}>
          <button
            onClick={() => { setChangingPw(v => !v); setPwError(''); setPwSuccess(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: 0 }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-text)' }}>🔒 Cambiar Contraseña</span>
            <span style={{ color: 'var(--c-text-muted)', fontSize: '18px' }}>{changingPw ? '▲' : '▼'}</span>
          </button>

          {changingPw && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pwSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '13px' }}>
                  ✅ Contraseña actualizada con éxito
                </div>
              )}
              {pwError && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px' }}>
                  ⚠️ {pwError}
                </div>
              )}
              <input
                type="password"
                placeholder="Contraseña actual"
                className="input-dark"
                value={pwForm.current}
                onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                className="input-dark"
                value={pwForm.next}
                onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                className="input-dark"
                value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
              />
              <button
                className="btn-green"
                style={{ padding: '12px', marginTop: '4px' }}
                onClick={async () => {
                  setPwError(''); setPwSuccess(false)
                  if (pwForm.next !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return }
                  if (pwForm.next.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres'); return }
                  const token = getToken()
                  if (!token) return
                  try {
                    await apiChangePassword(token, pwForm.current, pwForm.next)
                    setPwSuccess(true)
                    setPwForm({ current: '', next: '', confirm: '' })
                  } catch (e: any) {
                    setPwError(e.message)
                  }
                }}
              >
                Actualizar Contraseña
              </button>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div style={{
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '20px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>Cerrar Sesión</div>
            <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginTop: '2px' }}>Salir del sistema y volver al login</div>
          </div>
          <button onClick={handleLogout} style={{
            padding: '10px 20px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
            color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700,
          }}>
            Salir →
          </button>
        </div>

      </div>
    </div>
  )
}

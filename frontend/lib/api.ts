const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface LoginResponse {
  access_token: string
  user: {
    id: string
    name: string
    email: string
    role: string
    organizationId: string
    branchId: string | null
  }
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Credenciales incorrectas')
  }
  return res.json()
}

export async function apiGetProfile(token: string) {
  const res = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Sesión expirada')
  return res.json()
}

// ── Token helpers (localStorage) ──────────────────────
export const TOKEN_KEY = 'naturalos_token'
export const USER_KEY  = 'naturalos_user'

export function saveSession(token: string, user: LoginResponse['user']) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): LoginResponse['user'] | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

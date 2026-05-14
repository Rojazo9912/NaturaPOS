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

export interface Product {
  id: string
  name: string
  price: number
  categoryId: string | null
  category?: { id: string; name: string; emoji: string | null }
  isActive: boolean
  isFavorite: boolean
  description: string | null
}

export interface Category {
  id: string
  name: string
  emoji: string | null
  sortOrder: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  level: string
  points: number
  totalVisits: number
  totalSpent: number
}

export interface DashboardSummary {
  salesToday: number
  salesWeek: number
  salesMonth: number
  ordersToday: number
  avgTicket: number
  totalCustomers: number
}

export interface TopProduct {
  productId: string
  name: string
  totalQty: number
  totalRevenue: number
}

// ── Auth ───────────────────────────────────────────────
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message || 'Credenciales incorrectas')
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

// ── Products ───────────────────────────────────────────
export async function apiGetProducts(token: string): Promise<Product[]> {
  const res = await fetch(`${API}/api/v1/products`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando productos')
  return res.json()
}

export async function apiGetCategories(token: string): Promise<Category[]> {
  const res = await fetch(`${API}/api/v1/products/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando categorías')
  return res.json()
}

// ── Customers ──────────────────────────────────────────
export async function apiSearchCustomers(token: string, phone: string): Promise<Customer[]> {
  const res = await fetch(`${API}/api/v1/customers/search?phone=${phone}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error buscando clientes')
  return res.json()
}

export async function apiCreateCustomer(token: string, data: { name: string; phone: string; email?: string }): Promise<Customer> {
  const res = await fetch(`${API}/api/v1/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error creando cliente')
  return res.json()
}

// ── Orders ─────────────────────────────────────────────
export async function apiCreateOrder(token: string, data: {
  customerId?: string
  subtotal: number
  total: number
  items: Array<{ productId: string; quantity: number; unitPrice: number; subtotal: number }>
  payments: Array<{ method: string; amount: number }>
  pointsEarned?: number
}) {
  const res = await fetch(`${API}/api/v1/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).message || 'Error al procesar la orden')
  }
  return res.json()
}

// ── Dashboard ──────────────────────────────────────────
export async function apiGetDashboardSummary(token: string): Promise<DashboardSummary> {
  const res = await fetch(`${API}/api/v1/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando métricas')
  return res.json()
}

export async function apiGetTopProducts(token: string): Promise<TopProduct[]> {
  const res = await fetch(`${API}/api/v1/dashboard/top-products`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando top productos')
  return res.json()
}

export async function apiGetSalesByHour(token: string) {
  const res = await fetch(`${API}/api/v1/dashboard/sales-by-hour`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error')
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

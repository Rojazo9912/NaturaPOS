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
  pointsRedeemed?: number
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

export async function apiGetDashboardFranchise(token: string) {
  const res = await fetch(`${API}/api/v1/dashboard/franchise`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando métricas de franquicia')
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

// ── Cash Register ────────────────────────────────────────
export interface CashRegister {
  id: string
  branchId: string
  userId: string
  openedAt: string
  closedAt: string | null
  openingAmount: number
  closingAmount: number | null
  expectedAmount: number | null
  difference: number | null
  status: string
  notes: string | null
  cuts?: FinancialCut[]
}

export interface FinancialCut {
  id: string
  type: string
  totalSales: number
  totalCash: number
  totalCard: number
  grossProfit: number
}

export async function apiGetActiveRegister(token: string): Promise<CashRegister | null> {
  const res = await fetch(`${API}/api/v1/cash-register/active`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error buscando caja')
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function apiOpenRegister(token: string, openingAmount: number): Promise<CashRegister> {
  const res = await fetch(`${API}/api/v1/cash-register/open`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ openingAmount }),
  })
  if (!res.ok) throw new Error('Error al abrir caja')
  return res.json()
}

export async function apiCloseRegister(token: string, id: string, closingAmount: number, notes?: string) {
  const res = await fetch(`${API}/api/v1/cash-register/${id}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ closingAmount, notes }),
  })
  if (!res.ok) throw new Error('Error al cerrar caja')
  return res.json()
}

export async function apiGetRegisterHistory(token: string): Promise<CashRegister[]> {
  const res = await fetch(`${API}/api/v1/cash-register/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando historial de caja')
  return res.json()
}

// ── Inventory ────────────────────────────────────────
export interface InventoryItem {
  id: string
  branchId: string
  productId: string | null
  ingredientId: string | null
  quantity: number
  minStock: number
  product?: { id: string; name: string }
  ingredient?: { id: string; name: string; unit: string }
}

export async function apiGetInventory(token: string): Promise<InventoryItem[]> {
  const res = await fetch(`${API}/api/v1/inventory`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando inventario')
  return res.json()
}

// ── Security & Audit ─────────────────────────────────────
export async function apiGetAuditLogs(token: string) {
  const res = await fetch(`${API}/api/v1/security/audit-logs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando logs de auditoría')
  return res.json()
}

export async function apiGetRiskAlerts(token: string) {
  const res = await fetch(`${API}/api/v1/security/risk-alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando alertas de riesgo')
  return res.json()
}

export async function apiResolveRiskAlert(token: string, id: string) {
  const res = await fetch(`${API}/api/v1/security/risk-alerts/${id}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error resolviendo alerta')
  return res.json()
}

// ── Admin (Ingredients & Recipes) ──────────────────────
export interface Ingredient {
  id: string
  name: string
  unit: string
  costPerUnit: number
  minStock: number
}

export async function apiGetIngredients(token: string): Promise<Ingredient[]> {
  const res = await fetch(`${API}/api/v1/inventory/ingredients`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando insumos')
  return res.json()
}

export async function apiCreateIngredient(token: string, data: any) {
  const res = await fetch(`${API}/api/v1/inventory/ingredients`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error creando insumo')
  return res.json()
}

export async function apiUpsertRecipe(token: string, productId: string, data: any) {
  const res = await fetch(`${API}/api/v1/products/${productId}/recipe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error guardando receta')
  return res.json()
}

export async function apiGetRecipe(token: string, productId: string) {
  const res = await fetch(`${API}/api/v1/products/${productId}/recipe`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Error cargando receta')
  const data = await res.json()
  return data ? data : null
}

export async function apiCreateProduct(token: string, data: any) {
  const res = await fetch(`${API}/api/v1/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error creando producto')
  return res.json()
}

export async function apiUpdateProduct(token: string, id: string, data: any) {
  const res = await fetch(`${API}/api/v1/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error actualizando producto')
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

// ── Subscriptions ──────────────────────
export async function apiGetSubscriptionPlans(token: string) {
  const res = await fetch(`${API}/api/v1/subscriptions/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando planes de suscripción')
  return res.json()
}

export async function apiCreateSubscriptionPlan(token: string, data: any) {
  const res = await fetch(`${API}/api/v1/subscriptions/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error creando plan de suscripción')
  return res.json()
}

export async function apiSubscribeCustomer(token: string, customerId: string, planId: string) {
  const res = await fetch(`${API}/api/v1/subscriptions/customers/${customerId}/subscribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId }),
  })
  if (!res.ok) throw new Error('Error al suscribir cliente')
  return res.json()
}

// ── Transfers ──────────────────────
export async function apiGetTransfers(token: string) {
  const res = await fetch(`${API}/api/v1/transfers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando transferencias')
  return res.json()
}

export async function apiGetTransferBranches(token: string) {
  const res = await fetch(`${API}/api/v1/transfers/branches`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error cargando sucursales')
  return res.json()
}

export async function apiCreateTransfer(token: string, data: any) {
  const res = await fetch(`${API}/api/v1/transfers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error creando transferencia')
  return res.json()
}

export async function apiUpdateTransferStatus(token: string, id: string, status: string) {
  const res = await fetch(`${API}/api/v1/transfers/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Error actualizando estado de transferencia')
  return res.json()
}




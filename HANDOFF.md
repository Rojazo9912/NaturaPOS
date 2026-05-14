# 🌿 NaturaPOS — Handoff Document para Agente IA
> Documento de continuación del proyecto. Generado el 14 de Mayo 2026.
> Repositorio: https://github.com/Rojazo9912/NaturaPOS

---

## 📋 Contexto del Proyecto

**Natural OS** es el sistema operativo inteligente para **Natural by Nutrit**, un negocio de wellness/nutrición. Es un POS (Punto de Venta) completo con CRM, control de inventario y motor antifraude.

### Stack Tecnológico
| Capa | Tecnología |
|---|---|
| Backend | NestJS 11 + TypeScript |
| ORM | Prisma v7 (adapter-pg) |
| Base de Datos | PostgreSQL en Supabase |
| Frontend | Next.js 16 (App Router) + Tailwind CSS 4 |
| Deploy | Railway (backend + frontend) |
| Auth | JWT + Passport.js (bcryptjs) |

---

## 🌐 URLs de Producción

| Servicio | URL |
|---|---|
| Frontend | https://naturapos.up.railway.app |
| Backend API | https://naturapos-production.up.railway.app |
| Health check | https://naturapos-production.up.railway.app/api/v1/health |
| Login | https://naturapos.up.railway.app/login |
| POS | https://naturapos.up.railway.app/pos |

---

## 🔑 Credenciales de Acceso

```
Email:    admin@naturalbynutrit.com
Password: NaturaAdmin2026!
Role:     OWNER
```

---

## 📁 Estructura del Repositorio

```
NaturaPOS/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── app.controller.ts   # GET /api/v1/health
│   │   ├── auth/               # JWT + Passport + RBAC
│   │   │   ├── guards/         # JwtAuthGuard, LocalAuthGuard, RolesGuard
│   │   │   ├── decorators/     # @Roles(), @CurrentUser()
│   │   │   ├── strategies/     # jwt.strategy, local.strategy
│   │   │   └── dto/login.dto.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   ├── schema.prisma       # 18 modelos
│   │   └── seed.ts             # Org + Admin + Categorías
│   ├── prisma.config.ts        # Prisma v7 config con dotenv
│   ├── Dockerfile
│   ├── railway.toml
│   ├── tsconfig.json           # rootDir: ./src, module: commonjs
│   └── tsconfig.build.json     # exclude: prisma, test, node_modules
│
└── frontend/                   # Next.js 16
    ├── app/
    │   ├── globals.css         # Design system (CSS vars + animaciones)
    │   ├── layout.tsx          # Inter font via next/font/google
    │   ├── page.tsx            # Redirect a /pos
    │   ├── login/page.tsx      # Login (dark mode split layout)
    │   └── pos/page.tsx        # POS completo (datos mock por ahora)
    ├── lib/api.ts              # fetch helpers + auth localStorage
    ├── Dockerfile              # next build standalone
    ├── railway.toml
    └── next.config.ts          # output: "standalone"
```

---

## 🗄️ Modelos de BD (schema.prisma)

| Modelo | Descripción |
|---|---|
| `Organization` | Empresa raíz (multi-tenant) |
| `Branch` | Sucursales |
| `User` | Roles: OWNER, ADMIN, MANAGER, CASHIER, VIEWER |
| `Customer` | CRM (niveles: VERDE, GOLD, ELITE, LEGEND) |
| `CustomerLevel` | Config de niveles y beneficios |
| `Product` | Catálogo |
| `Category` | Categorías de productos |
| `Order` | Ventas |
| `OrderItem` | Items de venta |
| `Payment` | Métodos: CASH, CARD, TRANSFER, WALLET, QR |
| `Inventory` | Stock |
| `InventoryMovement` | Movimientos de stock |
| `Subscription` | Suscripciones del negocio |
| `AuditLog` | Auditoría (antifugas) |
| `RiskAlert` | Alertas de riesgo |
| `Notification` | Notificaciones |
| `DashboardConfig` | Dashboards |
| `PointsTransaction` | Puntos de fidelidad |

---

## 🔌 Endpoints Implementados

```
GET  /api/v1/health          → { status: "ok", timestamp }
POST /api/v1/auth/login      → { access_token, user }
GET  /api/v1/auth/me         → user profile  [Bearer token requerido]
```

**Login request:**
```json
{ "email": "admin@naturalbynutrit.com", "password": "NaturaAdmin2026!" }
```

**Login response:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": "uuid", "name": "Admin Natural", "email": "...", "role": "OWNER", "organizationId": "uuid" }
}
```

---

## ✅ Estado Actual

### ✅ Completado
- [x] BD con 18 modelos, migrada en Supabase
- [x] Seed con organización + sucursal + admin + categorías
- [x] Auth completo: JWT, Guards, RBAC (@Roles, @CurrentUser)
- [x] Backend desplegado en Railway (**verificar que no siga en 502 después del redeploy**)
- [x] Frontend POS: login + catálogo (18 productos mock) + carrito + 5 métodos de pago
- [x] Frontend desplegado en Railway (https://naturapos.up.railway.app)

### ⚠️ Pendiente inmediato
- [ ] **Agregar variable en Railway Frontend:**
  ```
  NEXT_PUBLIC_API_URL = https://naturapos-production.up.railway.app
  ```
  *(Esto dispara un redeploy automático con la URL del backend bakeada)*
- [ ] Verificar que el backend levante correctamente (estaba en 502 al momento del handoff)
- [ ] Probar login en producción end-to-end

---

## 🚀 Próximos Módulos a Implementar

### 1. Módulo Productos (Backend) — PRIORIDAD ALTA
```
GET  /api/v1/products                 # lista con filtros
GET  /api/v1/products/categories      # categorías
POST /api/v1/products                 # crear (ADMIN+)
PUT  /api/v1/products/:id             # actualizar
```
Crear: `backend/src/products/products.module.ts|service.ts|controller.ts`

### 2. Módulo Órdenes (Backend) — PRIORIDAD ALTA
```
POST /api/v1/orders    # crear orden (valida stock, descuentos, puntos)
GET  /api/v1/orders    # listar órdenes del día
```
Lógica: descontar inventario + registrar pago + sumar puntos al cliente

### 3. Módulo Clientes (Backend) — PRIORIDAD ALTA
```
GET  /api/v1/customers/search?phone=xxx   # buscar por teléfono
POST /api/v1/customers                    # registrar
GET  /api/v1/customers/:id                # perfil + historial
```

### 4. Conectar POS Frontend al Backend Real
En `frontend/app/pos/page.tsx`:
- Reemplazar `MOCK_CUSTOMERS` → `GET /api/v1/customers/search`
- Reemplazar `MOCK_PRODUCTS` → `GET /api/v1/products`
- Conectar "COBRAR" → `POST /api/v1/orders`

### 5. Dashboard
```
GET /api/v1/dashboard/summary       # ventas día/semana/mes
GET /api/v1/dashboard/top-products  # más vendidos
```
Página `/dashboard` en el frontend

---

## 🔧 Variables de Entorno

### Backend (Railway Variables)
```env
DATABASE_URL=postgresql://postgres.wharpdcmezvvkhfzvhbf:NaturaPos2026@aws-1-us-west-1.pooler.supabase.com:5432/postgres
JWT_SECRET=naturalos-secret-prod-2026
NODE_ENV=production
FRONTEND_URL=https://naturapos.up.railway.app
PORT=3001
```

### Frontend (Railway Variables) — FALTA AGREGAR ESTO
```env
NEXT_PUBLIC_API_URL=https://naturapos-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### Backend Local (`backend/.env`)
```env
DATABASE_URL="postgresql://postgres.wharpdcmezvvkhfzvhbf:NaturaPos2026@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="change-this-secret-in-production"
NODE_ENV=development
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

---

## ⚠️ Problemas Conocidos y Soluciones

| Problema | Causa | Solución |
|---|---|---|
| `Cannot find module '/app/dist/main'` | `.tsbuildinfo` cacheado — TypeScript no emite archivos | `*.tsbuildinfo` en `.gitignore` + `.dockerignore` + `RUN rm -f *.tsbuildinfo` en Dockerfile |
| `sh: nest: not found` (error 127) | `ENV NODE_ENV=production` antes de `npm ci` omite devDependencies | Mover `ENV NODE_ENV=production` al final del Dockerfile, después del build |
| `dist/src/main.js` en lugar de `dist/main.js` | `rootDir` computado incorrectamente por archivos fuera de `src/` | `"rootDir": "./src"` explícito + excluir `prisma` en `tsconfig.build.json` |
| Google Fonts @import error con Tailwind 4 | Turbopack expande CSS y el @import queda fuera de orden | Usar `next/font/google` en `layout.tsx` — nunca `@import url()` en CSS |

---

## 🏗️ Patrón para Crear Módulos NestJS

```typescript
// 1. products.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

// 2. Agregar a AppModule imports: [..., ProductsModule]

// 3. products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    return this.products.findAll(user.organizationId)
  }
}

// 4. products.service.ts
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      include: { category: true },
    })
  }
}
```

---

## 📦 Comandos Útiles

```bash
# Backend — desarrollo
cd backend && npm run dev

# Backend — producción local
cd backend && npm run build && npm run start:prod

# Backend — seed
cd backend && npx ts-node prisma/seed.ts

# Frontend — desarrollo
cd frontend && npm run dev

# Frontend — build standalone (Railway)
cd frontend && npm run build
node .next/standalone/server.js

# Supabase — ver BD
cd backend && npx prisma studio

# Deploy — git push dispara Railway auto-deploy
git add -A && git commit -m "..." && git push origin main
```

---

*Handoff generado por Antigravity AI · Natural OS v1.0 · 14 Mayo 2026*

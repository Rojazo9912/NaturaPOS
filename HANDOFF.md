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

## ✅ Estado Actual (Fase 1 - MVP completado al 80%)

En las últimas sesiones logramos implementar toda la infraestructura core y la conexión real Frontend-Backend. 

### ✅ Módulos Implementados y Funcionando
- **Autenticación (JWT + RBAC)**: Login, verificación de sesión, roles (CASHIER, OWNER, etc).
- **Catálogo de Productos**: API de productos/categorías. Catálogo poblado (18 productos reales).
- **POS Inteligente**: Búsqueda de clientes por teléfono (CRM), carrito, cálculo de totales, integración de puntos, 5 métodos de pago y creación de órdenes transaccionales.
- **Costeo Inteligente (Inventario)**: Cada venta descuenta automáticamente del inventario (sea producto directo o los insumos de una receta).
- **Corte de Caja (Dual)**: UI y lógica para abrir caja, registrar cierre, calcular diferencia física vs esperada y generar el Corte A (Real/Administrativo) y Corte B (Fiscal).
- **Dashboard Ejecutivo**: Vista `dashboard` con KPIs de ventas, ticket promedio, ventas por hora y Top Productos.
- **CORS & Despliegue**: Arreglo de CORS por "trailing slash" (`/`), y correcto manejo del `PORT` dinámico en Railway.

---

## 🚀 Próximos Módulos a Implementar (Fase 2 y 3)

Lo siguiente en la lista son las "Killer Features" que separan a Natural OS de un POS convencional.

### 1. Panel Administrativo (CRUD) — PRIORIDAD ALTA
*Actualmente los productos, usuarios y recetas están en BD, pero no hay una UI para gestionarlos.*
- UI para **Gestión de Catálogo**: Crear/Editar productos, precios y categorías.
- UI para **Gestión de Recetas**: Asignar qué ingredientes y cantidades componen cada producto (para el costeo inteligente).
- UI para **Insumos/Ingredientes**: Agregar kilos de proteína, litros de leche, etc., al inventario.

### 2. Motor Completo de Lealtad (Natural Points)
*Actualmente se ganan puntos, pero falta la lógica compleja.*
- Lógica de canjeo de puntos (`PaymentMethod = POINTS`).
- Cambios automáticos de Nivel (`CustomerLevel`: Verde -> Gold -> Elite) según visitas/gastos.

### 3. Motor Antifugas y Auditoría (Seguridad Empresarial)
- Implementar el `AuditLog` en cada acción sensible (ej. cancelar orden, editar precio).
- Lógica de `RiskAlert`: Asignar un `RiskScore` a los empleados si hacen descuentos manuales seguidos o tienen descuadres constantes en el Corte de Caja.

### 4. Modo Franquicia (Multi-Sucursal)
- UI para visualizar métricas comparativas entre sucursales.
- Transferencia de inventario entre sucursales (`InventoryTransfer`).

### 5. Suscripciones y Recurrencia
- Crear la UI y backend para el "Plan Recovery" (cobro recurrente a clientes y asignación de "Smoothies gratis por mes").

---

## 🔧 Variables de Entorno (Producción - Railway)

### Backend
```env
DATABASE_URL=postgresql://...
JWT_SECRET=naturalos-secret-prod-2026
NODE_ENV=production
FRONTEND_URL=https://naturapos.up.railway.app
# PORT=8080 (Se deja que Railway lo asigne automáticamente, NUNCA setear PORT manualmente en backend panel)
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://naturapos-production.up.railway.app
NODE_ENV=production
```

---

## ⚠️ Lecciones Aprendidas (Troubleshooting)

| Problema | Solución Histórica |
|---|---|
| **CORS blocked (Access-Control-Allow-Origin)** | Problema de "trailing slash". Se actualizó `main.ts` para aceptar la URL con y sin `/` final usando `process.env.FRONTEND_URL.replace(/\/$/, '')`. |
| **Error 502 Bad Gateway en Railway Backend** | Ocurre por 2 razones: (1) Caché `.tsbuildinfo` corrupto (se arregló forzando su borrado en Dockerfile). (2) Colisión de puertos: Railway asigna `PORT=8080` internamente, si forzamos `PORT=3001` en env vars la app escucha un puerto y Railway rutea a otro. Solución: no hardcodear puerto, usar `process.env.PORT`. |
| **Google Fonts error con Tailwind 4** | Turbopack expande CSS y el `@import` queda fuera de orden. Solución: Usar `next/font/google` en Next.js, no usar `@import` en CSS. |

---

*Handoff actualizado por Antigravity AI · Natural OS v1.1 · 14 Mayo 2026*

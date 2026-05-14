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

## ✅ Estado Actual (Fases 1 a 5 — COMPLETADAS)

NaturaPOS es ahora un ecosistema funcional y estable. Hemos superado la fase de infraestructura y el sistema está listo para operación real.

### ✅ Módulos Implementados (Estado: Producción)
- **POS Inteligente**: Búsqueda CRM, lealtad integrada (puntos y niveles), 5 métodos de pago y despacho de productos.
- **Inventario & Costeo**: Auto-deducción por recetas, transferencias entre sucursales y ajustes manuales.
- **Dashboard & Franquicia**: KPIs avanzados, gráficas de ventas por hora y vista comparativa multi-sucursal.
- **Seguridad (Antifugas)**: Motor de alertas de riesgo (RiskAlert) y registro de auditoría (AuditLog).
- **PWA & Responsividad**: Aplicación instalable (iOS/Android) con layouts optimizados para móvil y offline base.
- **Gestión de Personal**: Sistema de roles (RBAC) con interfaz descriptiva de permisos y creación de perfiles.
- **Corte de Caja (Dual)**: Conciliación física vs sistema con generación de reporte administrativo (Real) y fiscal.

---

## 🚀 Fase 6: Pulido y Automatización (Lo que falta)

Para que el sistema sea un producto "Llave en Mano" de clase mundial, se sugieren los siguientes puntos:

### 1. 🖨️ Módulo de Impresión y Recibos
- Generación de **Tickets PDF** para clientes.
- Integración con **Impresoras Térmicas** (ESC/POS) vía Web USB o Bluetooth.
- Envío automático de recibos por WhatsApp/Email al finalizar la venta.

### 2. 📡 Notificaciones en Tiempo Real
- Implementar **Socket.io** para alertas instantáneas de seguridad al Owner (push notifications).
- Notificaciones de "Stock Bajo" automáticas al encargado de compras.
- Alertas de transferencias de inventario entrantes.

### 3. 📊 Reportes y Exportación Avanzada
- Exportación de cortes de caja y ventas a **Excel/CSV**.
- Reportes mensuales de rentabilidad (Ingresos vs Costo de Insumos).
- Dashboard de inventario proyectado (basado en velocidad de venta histórica).

### 4. 💳 Automatización de Pagos (Suscripciones)
- Integración con pasarela de pagos (**Stripe / Conekta**) para cobros recurrentes del "Plan Recovery".
- Conciliación bancaria automática para pagos con tarjeta.

### 5. 🛡️ Robustez y Seguridad Extra
- Implementación completa del flujo **MFA (2FA)** con códigos QR (Google Authenticator).
- **Modo Offline 2.0**: Sincronización robusta vía Service Workers e IndexedDB para ventas prolongadas sin internet.

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

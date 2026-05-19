# NaturaPOS / Natural OS

NaturaPOS, también presentado como Natural OS, es un monorepo para un sistema de punto de venta wellness con backend NestJS y frontend Next.js, enfocado en operación de sucursales, ventas, caja, inventario y experiencia PWA para entornos retail modernos.

## Stack

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js 16 + Tailwind CSS v4 + PWA

## Estructura del monorepo

- `backend/`: API NestJS, Prisma, lógica del servidor y tests
- `frontend/`: aplicación Next.js para POS, dashboard y vistas cliente
- `docs/`: documentación de handoff y diseño del producto

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose
- `pnpm` o `npm`

## Arranque local con Docker Compose

1. Copia las variables necesarias tomando como referencia `backend/.env.example`.
2. Inicia la base de datos y los servicios del monorepo:
   - `docker compose up --build`
3. Servicios esperados:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`
   - PostgreSQL: `localhost:5432`

## Variables de entorno principales

El backend usa como base `backend/.env.example`. Las variables más importantes para desarrollo local son:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL`

En el frontend, la variable principal para desarrollo es:

- `NEXT_PUBLIC_API_URL`

## Scripts de desarrollo

### Backend

- `npm --prefix backend run start:dev`
- `npm --prefix backend run build`
- `npm --prefix backend run lint`
- `npm --prefix backend test`

### Frontend

- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`

## Documentación adicional

- Handoff del proyecto: `docs/HANDOFF.md`
- Documento de visión/diseño: `docs/NaturaPOS.md`
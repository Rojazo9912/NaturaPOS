# ─────────────────────────────────────────────
# Natural OS — Dockerfile (Railway)
# Multi-stage: build limpio + runner con node_modules completo
# ─────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias (incluyendo dev para el build)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generar Prisma Client (binarios para linux/amd64)
RUN npx prisma generate

# Copiar código y compilar
COPY . .
RUN npm run build

# Eliminar dev dependencies (deja solo producción)
RUN npm prune --production

# ─── Runner (imagen final) ───────────────────

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copiar build compilado
COPY --from=builder /app/dist ./dist

# Copiar node_modules completo (ya prunado a producción + Prisma client generado)
COPY --from=builder /app/node_modules ./node_modules

# Copiar configs necesarios en runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]

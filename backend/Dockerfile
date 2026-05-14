# ─────────────────────────────────────────────
# Natural OS — Dockerfile (Railway)
# Multi-stage build para imagen optimizada
# ─────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (cache layer)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copiar todo el código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Build del proyecto
RUN npm run build

# ─── Runner (imagen final ligera) ────────────

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Solo dependencias de producción
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Copiar build y Prisma Client generado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["node", "dist/main"]

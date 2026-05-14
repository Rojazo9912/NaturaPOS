# ─────────────────────────────────────────────
# Natural OS — Frontend Dockerfile
# Next.js standalone build para Railway
# ─────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# NEXT_PUBLIC_* vars deben pasarse en BUILD TIME
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copiar código y compilar
COPY . .
RUN npm run build

# ── Runner ────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copiar solo los archivos del standalone build (imagen mínima)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Next.js standalone genera un server.js en la raíz
CMD ["node", "server.js"]

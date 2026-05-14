# ─────────────────────────────────────────────
# Natural OS — Dockerfile (single-stage, más simple y confiable)
# ─────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Instalar todas las dependencias (incluyendo dev para el build)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

# Copiar el código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Eliminar dev dependencies para reducir imagen
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/main"]

# ─────────────────────────────────────────────
# Natural OS — Dockerfile
# NODE_ENV=production va DESPUÉS del build para que
# npm ci instale devDependencies (incluye @nestjs/cli)
# ─────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# Instalar TODAS las deps (dev + prod) para poder compilar
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# Eliminar devDependencies después del build
RUN npm prune --production

# Ahora sí setear producción (DESPUÉS del build)
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main"]

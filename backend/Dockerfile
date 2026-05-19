# ─────────────────────────────────────────────
# Natural OS — Dockerfile
# ─────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# Instalar TODAS las deps (dev + prod) — NODE_ENV no debe estar seteado aquí
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Limpiar cache incremental de TypeScript (evita builds vacíos)
RUN rm -f *.tsbuildinfo

# Compilar con verificación explícita
RUN npm run build && \
    echo "=== dist/ contents ===" && \
    ls -la dist/ && \
    test -f dist/main.js && \
    echo "✅ dist/main.js verified"

# Eliminar devDependencies
RUN npm prune --production

# Setear producción DESPUÉS del build
ENV NODE_ENV=production

# Railway asigna PORT automáticamente — no hardcodear
EXPOSE ${PORT:-8080}

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]

# syntax=docker/dockerfile:1

# 1. Imagen base con Node.js 20 sobre Alpine Linux
FROM node:20-alpine AS base

# 2. Instalación de dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 3. Compilación de producción
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compilación de la aplicación Next.js en modo standalone
RUN npm run build

# Compilación del script de migraciones a JavaScript ejecutable nativo
RUN npx tsc src/db/migrate.ts --outDir dist --module esnext --moduleResolution bundler --target es2022 --skipLibCheck

# 4. Imagen final de ejecución (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Creación de usuario sin privilegios para mitigar riesgos de seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia de archivos estáticos y servidor standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia de migraciones SQL y runner de migraciones compilado
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.js ./dist/migrate.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

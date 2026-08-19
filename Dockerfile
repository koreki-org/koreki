# Stage 1: Dependencies
FROM node:24-bookworm-slim AS deps
WORKDIR /app

# Install openssl and other native deps early to fix Prisma detection
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

# Stage 1.5: Production Dependencies (pruned)
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY --from=deps /app ./
RUN npm prune --omit=dev --legacy-peer-deps

# Stage 2: Builder
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Build-time variables
ARG NEXT_PUBLIC_KOREKI_MODE=community
ARG NEXT_PUBLIC_SINGLE_USER_MODE=true
ARG NEXT_PUBLIC_AUTH_TYPE=NONE
ARG NEXT_PUBLIC_OIDC_ISSUER=""
ARG NEXT_PUBLIC_OIDC_CLIENT_ID=""
ARG NEXT_PUBLIC_BASE_URL=""

ENV NEXT_PUBLIC_KOREKI_MODE=$NEXT_PUBLIC_KOREKI_MODE
ENV NEXT_PUBLIC_SINGLE_USER_MODE=$NEXT_PUBLIC_SINGLE_USER_MODE
ENV NEXT_PUBLIC_AUTH_TYPE=$NEXT_PUBLIC_AUTH_TYPE
ENV NEXT_PUBLIC_OIDC_ISSUER=$NEXT_PUBLIC_OIDC_ISSUER
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL in the runner as well (required for Prisma runtime)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --create-home --home-dir /home/nextjs nextjs

# Copy standalone output (includes minimal node_modules)
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma/
COPY --chown=nextjs:nodejs --from=builder /app/scripts/start.sh ./start.sh
COPY --chown=nextjs:nodejs --from=builder /app/prisma.config.ts ./prisma.config.ts

# CRITICAL: We copy the production-pruned node_modules
# This guarantees that the prisma CLI has all of its transitive dependencies (effect, pathe, fast-check, etc.)
# without bloating the image with devDependencies (eslint, typescript, playwright, jest, etc.).
COPY --chown=nextjs:nodejs --from=prod-deps /app/node_modules ./node_modules

# Fix permissions, CRLF line endings, and pre-create storage
RUN sed -i 's/\r$//' ./start.sh && \
    chmod +x ./start.sh && \
    mkdir -p data/prompts && \
    chown -R nextjs:nodejs data

USER nextjs

EXPOSE 3000

# Lebenszeichen fuer die Orchestrierung (Coolify, Docker, Compose).
#
# Ohne diese Zeile bleibt der Orchestrierung nur "laeuft der Container" — und
# das ist zu schwach: Ein Next.js-Server antwortet auf Port 3000 auch dann
# noch, wenn die Datenbank weg ist. Also genau im Fall, den man bemerken will.
# `/api/health` fasst sie deshalb wirklich an und meldet dann 503.
#
# `node` statt `curl`: Das schlanke Basis-Image bringt kein curl mit, und es
# dafuer zu installieren hiesse, die Angriffsflaeche fuer eine Zeile zu
# vergroessern.
#
# `start-period` grosszuegig, weil Next.js beim ersten Start compiliert — ohne
# das meldete die Orchestrierung eine gesunde Instanz waehrend des Hochfahrens
# als krank und startete sie im Kreis neu.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3     CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["./start.sh"]

# Stage 1: Dependencies
FROM node:24-bookworm-slim AS deps
WORKDIR /app

# Install openssl and other native deps early to fix Prisma detection
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

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
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/scripts/start.sh ./start.sh
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# CRITICAL: We only copy the prisma binary/engines needed for migrations
# The app itself uses the client bundled in standalone.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /app/node_modules/pure-rand ./node_modules/pure-rand
COPY --from=builder /app/node_modules/@standard-schema ./node_modules/@standard-schema

# Fix permissions and pre-create storage
RUN chmod +x ./start.sh && \
    mkdir -p data/prompts && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /home/nextjs

USER nextjs

EXPOSE 3000

CMD ["./start.sh"]

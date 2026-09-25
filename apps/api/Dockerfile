# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache font-noto-bengali
# Suppress any corporate proxy injected by BuildKit so npm/pnpm reach
# registry.npmjs.org directly (the proxy blocks their requests with 403).
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG http_proxy=""
ARG https_proxy=""
RUN npm install -g pnpm@9.15.4

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

# Copy workspace manifests first — changes here invalidate the install layer,
# but source changes below do not.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json                 ./apps/api/
COPY packages/database/package.json       ./packages/database/
COPY packages/shared/package.json         ./packages/shared/
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/config/package.json         ./packages/config/
COPY packages/ui/package.json             ./packages/ui/

RUN pnpm install --frozen-lockfile \
    --fetch-retries=5 \
    --fetch-timeout=120000 \
    --network-concurrency=4

# Copy source after install so code edits don't bust the deps layer
COPY packages/   ./packages/
COPY apps/api/   ./apps/api/
COPY apps/admin/public/logo.svg ./apps/admin/public/logo.svg
COPY tsconfig.base.json ./

# Generate Prisma client for the builder's platform (linux/amd64 or arm64)
RUN pnpm --filter @delta-signal/database run db:generate

RUN pnpm --filter @delta-signal/shared build && \
    pnpm --filter @delta-signal/api build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /repo

# Suppress corporate proxy so npm can reach registry (same reason as in base stage)
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG http_proxy=""
ARG https_proxy=""

# Install only production dependencies in a clean environment
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json                 ./apps/api/
COPY packages/database/package.json       ./packages/database/
COPY packages/shared/package.json         ./packages/shared/
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/config/package.json         ./packages/config/
COPY packages/ui/package.json             ./packages/ui/

# Workspace package sources must be present so pnpm can link them
COPY packages/shared/src/     ./packages/shared/src/
COPY packages/database/src/   ./packages/database/src/
COPY packages/database/prisma ./packages/database/prisma
COPY apps/admin/public/logo.svg ./apps/admin/public/logo.svg

RUN pnpm install --frozen-lockfile --prod \
    --fetch-retries=5 \
    --fetch-timeout=120000 \
    --network-concurrency=4

# prisma CLI is a devDep so it's absent after --prod install. Install it globally
# just long enough to generate the client for this platform, then remove it.
RUN npm install -g prisma@6 && \
    pnpm --filter @delta-signal/database run db:generate

# Copy compiled application from builder
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist

# Entrypoint runs `prisma migrate deploy` before starting the process
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Drop root — run as a dedicated non-privileged user
RUN addgroup -S nature && adduser -S api -G nature
USER api

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- "http://localhost:${PORT:-3001}/api/v1/health" || exit 1

WORKDIR /repo/apps/api
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/apps/api/src/main.js"]

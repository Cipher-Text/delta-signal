# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG http_proxy=""
ARG https_proxy=""
RUN npm install -g pnpm@9.15.4

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json                 ./apps/web/
COPY packages/shared/package.json         ./packages/shared/
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/config/package.json         ./packages/config/
COPY packages/ui/package.json             ./packages/ui/

RUN pnpm install --frozen-lockfile \
    --fetch-retries=5 \
    --fetch-timeout=120000 \
    --network-concurrency=4

COPY packages/   ./packages/
COPY apps/web/   ./apps/web/
COPY tsconfig.base.json ./

# NEXT_TELEMETRY_DISABLED keeps the build quiet in CI/Docker
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @delta-signal/web build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S nature && adduser -S web -G nature

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The standalone directory is self-contained: it includes the Next.js server
# and all traced production dependencies. It is placed relative to
# outputFileTracingRoot (the repo root), so the server entry point is at
# apps/web/server.js inside the standalone tree.
COPY --from=builder --chown=web:nature \
  /repo/apps/web/.next/standalone ./

# Static assets and public files sit outside standalone and must be copied in
COPY --from=builder --chown=web:nature \
  /repo/apps/web/.next/static ./apps/web/.next/static

# Public assets such as the logo are served from the application root.
COPY --from=builder --chown=web:nature \
  /repo/apps/web/public ./apps/web/public

USER web

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- "http://localhost:${PORT}/api/health" 2>/dev/null || \
      wget -qO- "http://localhost:${PORT}/" >/dev/null || exit 1

CMD ["node", "apps/web/server.js"]

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
COPY apps/admin/package.json               ./apps/admin/
COPY packages/config/package.json         ./packages/config/
COPY packages/ui/package.json             ./packages/ui/

RUN pnpm install --frozen-lockfile

COPY packages/   ./packages/
COPY apps/admin/ ./apps/admin/
COPY tsconfig.base.json ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @delta-signal/admin build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S nature && adduser -S admin -G nature

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=admin:nature \
  /repo/apps/admin/.next/standalone ./

COPY --from=builder --chown=admin:nature \
  /repo/apps/admin/.next/static ./apps/admin/.next/static

# Public assets such as the logo are served from the application root.
COPY --from=builder --chown=admin:nature \
  /repo/apps/admin/public ./apps/admin/public

USER admin

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- "http://localhost:${PORT}/" >/dev/null || exit 1

CMD ["node", "apps/admin/server.js"]

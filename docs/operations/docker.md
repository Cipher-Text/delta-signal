# Docker

## Images

| Image | Dockerfile | Port | Notes |
|---|---|---|---|
| `delta-signal/api` | `apps/api/Dockerfile` | 3001 | NestJS — runs `prisma migrate deploy` on start |
| `delta-signal/web` | `apps/web/Dockerfile` | 3000 | Next.js standalone |
| `delta-signal/admin` | `apps/admin/Dockerfile` | 3002 | Next.js standalone (shell only) |

All three build from the **repo root** as the Docker context — workspace packages
(`packages/shared`, `packages/contracts`, `packages/database`) are required at
build time.

## Local production stack

```bash
# 1. Copy and fill in required secrets
cp .env.example .env.prod
#    Edit .env.prod — set POSTGRES_PASSWORD and JWT_SECRET at minimum

# 2. Build and start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 3. Follow logs
docker compose -f docker-compose.prod.yml logs -f api

# 4. Stop
docker compose -f docker-compose.prod.yml down
```

## Required environment variables

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | Yes | No default — will fail to start without it |
| `JWT_SECRET` | Yes | ≥ 32 chars, no known placeholders — `openssl rand -base64 48` |
| `POSTGRES_DB` | No | Default `delta_signal` |
| `POSTGRES_USER` | No | Default `delta_signal` |
| `CORS_ORIGIN` | No | Default `http://localhost:3000` |
| `API_URL` | No | Default `http://api:3001` (internal service name) |
| `SMTP_HOST` | No | Email delivery disabled if absent |
| `SMTP_PORT` | No | Default `587` |
| `SMTP_USER` | No | |
| `SMTP_PASS` | No | |
| `SMTP_FROM` | No | Default `Delta Signal Alerts <alerts@deltasignal.org>` |

## Building individual images

```bash
# Build only the API image (from repo root)
docker build -f apps/api/Dockerfile -t delta-signal/api .

# Build only the web image
docker build -f apps/web/Dockerfile -t delta-signal/web .
```

## Database migrations

The API container runs `prisma migrate deploy` automatically via
`apps/api/docker-entrypoint.sh` before the NestJS process starts. Migrations
are applied on every container start — Prisma's deploy command is idempotent
(already-applied migrations are skipped).

To run migrations manually against a running Postgres:

```bash
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy \
  --schema=/repo/packages/database/prisma/schema.prisma
```

## Health checks

| Service | Endpoint | Mechanism |
|---|---|---|
| `postgres` | — | `pg_isready` via compose healthcheck |
| `api` | `GET /api/v1/health` | `wget` inside container |
| `web` | `GET /` | `wget` inside container |
| `admin` | `GET /` | `wget` inside container |

The `api` service waits for `postgres` to pass its health check before starting
(`depends_on: condition: service_healthy`), ensuring migrations don't attempt
to connect to an uninitialised database.

## Known gaps (v1)

- **No Nginx reverse proxy** — ports are exposed directly. Add Nginx in front
  for TLS termination, compression, and edge rate limiting. Placeholder in
  `infrastructure/nginx/`.
- **No automated backups** — schedule `pg_dump` externally or add a `backup`
  service to `docker-compose.prod.yml`.
- **No secrets manager** — env vars in `.env.prod` are plaintext at rest.
  Replace with Docker secrets or a platform secret store (AWS SSM, Vault, etc.)
  before any multi-host deployment.
- **Single-host only** — the compose file runs everything on one machine.
  For distributed deployments, see `infrastructure/terraform/` (placeholder).

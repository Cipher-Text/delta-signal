# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Project overview

Delta Signal is a civic environmental intelligence platform for Bangladesh.
It is an Nx monorepo using pnpm workspaces:

- `apps/api` — NestJS modular monolith, port 3001
- `apps/web` — Next.js 15 public application, port 3000
- `apps/admin` — Next.js 15 administration console, port 3002
- `apps/data-worker` — Python GIS/scientific-processing placeholder
- `packages/database` — Prisma schema, client, and migrations
- `packages/shared` — canonical shared enums and types
- `packages/contracts` — frontend/API route and DTO contracts
- `packages/ui`, `packages/config` — currently placeholders

The API is organized by domain modules. Current implemented domains include
auth, users, organizations, locations, weather, flood, biodiversity,
reports, alerts, observations, restoration, datasets, media, notifications,
analytics, permissions, gamification, water bodies, radiation, marine,
emissions, companies, facilities, and ingestion.

## Essential commands

Run from the repository root:

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm dev
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

API-specific commands can be run from `apps/api`:

```bash
pnpm exec jest
pnpm exec jest --testPathPattern=auth.service
pnpm exec jest --testPathPattern=observations.service
pnpm exec jest --config jest.e2e.config.js --runInBand
```

The web and admin test scripts are currently placeholders. Do not describe
them as coverage unless real tests have been added.

## Database and migrations

- PostgreSQL 16 with PostGIS is required.
- Local PostgreSQL uses port 5432.
- Docker Compose runs Redis and the applications; PostgreSQL is configured
  separately through `DATABASE_URL` / `DOCKER_DATABASE_URL`.
- Prisma schema: `packages/database/prisma/schema.prisma`.
- IDs are Prisma CUIDs; use `@IsString()`, not `@IsUUID()`, in DTOs.
- Current schema state: 62 models, 33 enums, 14 migrations.
- All enum values are uppercase and must remain consistent across Prisma,
  `packages/shared`, guards, DTOs, and contracts.

Before changing the schema:

1. Inspect the existing schema and latest migration.
2. Make the Prisma change.
3. Generate a named migration with `pnpm db:migrate` when appropriate.
4. Regenerate the client with `pnpm db:generate`.
5. Update relevant architecture and API documentation.

Never reset, drop, or destructively rewrite the database unless the user
explicitly requests it and the target is confirmed.

## API conventions

- API prefix: `/api/v1`.
- Use NestJS module/controller/service/DTO structure.
- Global validation uses `whitelist`, `forbidNonWhitelisted`, and `transform`.
- Public endpoints use `@Public()`.
- Role restrictions use uppercase `@Roles(...)` values matching Prisma enums.
- Fine-grained access uses `@RequirePermissions(...)` and the database-backed
  permission model.
- Mutations should write an `AuditEvent` where the domain requires auditing.
- Preserve the existing paginated response shapes and shared contract types.
- External ingestion modules should record `IngestionJob` results and handle
  provider failures without taking down the API.

## Frontend conventions

- Use Next.js App Router and Server Components by default.
- Form mutations use Server Actions.
- Keep state in URL parameters or secure httpOnly cookies where possible.
- Avoid introducing Redux, Zustand, or unnecessary client-side state.
- Keep web and admin applications independent; they must not import each
  other directly.
- Update `packages/contracts` when adding or changing API routes or DTOs.

## Authentication and security

- Access tokens are JWTs; refresh tokens are opaque random values stored as
  SHA-256 hashes in PostgreSQL and rotated on use.
- `JWT_SECRET` is required, must be at least 32 characters, and must not be a
  known placeholder.
- Do not expose `.env`, `.env.prod`, or other secret-bearing files.
- Do not weaken guards, validation, CORS, rate limits, or audit behavior to
  make a test or local run pass.
- Preserve the separate cookie names used by web and admin.

## Working practices

- Inspect `git status` before editing and preserve unrelated user changes.
- Prefer `rg` / `rg --files` for searching.
- Use `apply_patch` for local file edits.
- Make the smallest change that fully addresses the request.
- Run proportionate verification after changes; at minimum use
  `git diff --check` and the relevant build/test command.
- Do not commit, push, reset, or delete user data unless explicitly asked.

## Documentation synchronization

Update documentation when behavior or project facts change:

- `README.md` for setup and high-level product information
- `docs/architecture/` for modules, schema, and infrastructure
- `docs/api/` and `packages/contracts` for API changes
- `docs/roles-and-permissions.md` for access-control changes
- `docs/progress.md` and `docs/roadmap.md` for milestone/status changes
- this file when commands, conventions, architecture, or agent assumptions
  change

Do not update historical progress entries merely to rewrite history; correct
current-state summaries and add a new dated entry when appropriate.

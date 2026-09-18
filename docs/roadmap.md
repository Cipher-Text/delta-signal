# Roadmap

Delta Signal is built public-first toward a serious environmental intelligence platform. Dates are intentionally omitted until team capacity and release targets are known.

## Phase 0: Product and Architecture Baseline

Status: **Done**

Goal: Define the product shape, access model, domain boundaries, and reviewable UI direction before deep implementation.

Deliverables:

- Monorepo scaffold ✓
- Public-first product docs ✓
- Role and access model ✓
- Backend API catalog ✓
- Business logic and flows ✓
- Frontend static mocks (all 11 pages) ✓
- Initial app/package skeletons ✓

Exit criteria met:

- Docs explain what is public, login-gated, and role-gated.
- Mocks show the public single-page board and all major feature pages.
- Backend module direction is clear enough for implementation.

## Phase 1: Public Web Foundation

Status: **Done**

Goal: Build the public `/` page as a useful environmental board without login.

Deliverables:

- Public home page ✓
- Public metrics section ✓
- Public map preview layout ✓
- Public alerts preview ✓
- Verified reports preview ✓
- Dataset summary preview ✓
- Biodiversity/restoration/community highlights ✓
- Responsive navigation ✓

Exit criteria met:

- The public page is usable without authentication.
- Login CTAs are only shown for contribution, download, and advanced workflows.
- Layout is responsive across desktop and tablet.

## Phase 2: Backend Foundation

Status: **Done**

Goal: Implement stable backend primitives before broad feature work.

Deliverables:

- Auth and JWT token flow (register, login, profile, refresh with rotation, logout) ✓
- Users and role management ✓
- Organizations baseline ✓
- Geography — all 8 Bangladesh divisions, 64 districts, auto-seeded ✓
- Provider/provenance baseline ✓
- Dataset catalog with access policy ✓
- Evidence and audit primitives (AuditEvent on all write flows) ✓
- Shared type contracts (`packages/shared`, `packages/contracts`) ✓
- Global validation pipe and guard infrastructure ✓ — shipped with two bugs, both fixed 2026-08-17: a casing bug that made role checks always fail (see below), and a `districtId` validator on `CreateReportDto`/`CreateAlertDto` that required a UUID when this schema only ever generates CUIDs, rejecting any submission that specified a real district — see `docs/progress.md` "Report Submission Form".

Exit criteria met:

- Public read APIs exist for locations, dataset summaries, verified reports, and active alerts.
- Authenticated APIs exist for report and alert contribution.
- ~~Moderator/admin permissions are enforced for status change flows.~~ This was **not actually true** until 2026-08-17 — a `@delta-signal/shared` enum-casing bug made every role check fail, so moderator/admin permissions rejected everyone rather than enforcing anything. Genuinely true now; see `docs/progress.md` "Critical RBAC Fix".

Remaining gaps (carry into Phase 3):

- ~~Auth refresh/logout needs Redis token store~~ Done (2026-08-16) — Postgres-backed `RefreshToken` model with rotation, not Redis; see `docs/progress.md` "Auth Refresh/Logout".
- ~~`lat/lng Float` should be replaced with PostGIS `geography` type~~ Partially done (2026-09-01) — `District.geom geography(Point, 4326)` added by migration `20260901000000_postgis_geometry`. Polygon geometry (boundaries, alert zones, water bodies) still planned.
- ~~Prisma migration and seed not yet run (no live database)~~ Stale — migrations have run and the database has been live since M4.
- ~~Role-gated endpoints reject every user due to an enum-casing bug~~ Done (2026-08-17) — see `docs/progress.md` "Critical RBAC Fix". Open follow-up: no automated regression test guards against this recurring.

## Phase 3: Environmental Core

Status: **Done** (closed 2026-09-01) — all deliverables complete. Dataset download and access-request endpoints landed 2026-08-24 as part of Phase 4; PostGIS point geometry on `District` landed 2026-09-01. Polygon geometry (boundaries, alert zones) carries into Phase 7 as a geospatial infrastructure item rather than a Phase 3 blocker.

Goal: Add the primary environmental workflows and connect the frontend to real backend data.

Deliverables:

- ~~Observations module (schema in place; service/controller needed)~~ Done (2026-08-17) — full CRUD + trust-level workflow (`RESEARCHER`/`ADMIN` promote `UNVERIFIED` → `RESEARCH_GRADE`/etc.), wired to a real `/observations` page with a working submission form. See `docs/progress.md` "Observations Module".
- ~~Restoration projects module~~ Done (2026-08-19) — full CRUD, `ORGANIZATION_ADMIN`/`ADMIN`-gated creation, ownership-gated updates, idempotent citizen "join," wired to a real `/restoration` page. See `docs/progress.md` "Restoration Projects Module". (Not separately tracked as a Phase 3 deliverable before this — added here now that it's done.)
- ~~Biodiversity records~~ Done (2026-08-19) — daily GBIF sync (self-contained in `apps/api/src/biodiversity/`, not the generic `ingestion` module, same design deviation as weather), public species/occurrence endpoints, wired to a real `/biodiversity` page with name search. IUCN conservation-status enrichment deliberately skipped for v1 (no per-species API call built yet). See `docs/progress.md` "Biodiversity + GBIF Module". Community sidebar nav link removed (2026-08-24) — `/community` page remained but was unreachable via navigation. Restored once the Community module shipped (2026-09-01).
- ~~Media/evidence records~~ Done — `ReportComment` and `ReportMedia` schema + `POST/GET /reports/:id/comments` and `POST/GET /reports/:id/media` endpoints live (2026-08-22). File upload transport now handled by the `media` module (`POST /media/upload`, `POST /media/presign`) using S3/MinIO (2026-08-29). Nested comment replies deliberately deferred. See M8 in `implementation-plan.md`.
- ~~Moderation queue~~ Done (2026-08-22) — admin console report moderation queue (`apps/admin`) with full 5-status workflow. See M12 in `implementation-plan.md`.
- ~~Dataset download and access-request endpoints~~ Done (2026-08-24) — `GET /datasets/:id/download` with all 5 access policies enforced, `POST /datasets/:id/access-request`, admin approve/reject. Landed as part of Phase 4 work; see Phase 4 notes.
- ~~Connect public web page to live API (replace static seed data)~~ Done (2026-08-19) — every homepage section now fetches live data with a fallback to static content if the API is unreachable: weather sidebar (2026-08-16), metrics cards (2026-08-19), dataset preview/reports/alerts previews/biodiversity+restoration highlights (2026-08-19); the community feed has no backend to wire to, so it shows an honest empty state instead (same treatment as the `/community` page). Nav is session-aware (real login state, 2026-08-16). See `docs/progress.md` "Homepage Preview Sections Wired" — a real honesty bug (treating an empty-but-successful response the same as an API failure) was caught and fixed during this pass.
- ~~Auth refresh / logout with Redis token store~~ Done (2026-08-16) — Postgres-backed, not Redis (see Phase 2 note above). Frontend login/register/logout flow also wired (2026-08-16): httpOnly cookie sessions, middleware-based route protection + token refresh, new `/login`/`/register`/`/profile` routes. `/profile` rebuilt (2026-08-17) to match its mockup's sidebar app-shell design, with honest empty states instead of the mock's fabricated eco score/badges/activity feed — this also established a reusable sidebar shell (`AppSidebar`). ~~Build `/data`, `/observations`, `/reports`, `/alerts`, `/biodiversity`, `/restoration`, `/community` as real routes (Milestone 15).~~ Done (2026-08-17) — `/data`, `/reports`, `/alerts` wired to real backend data (see `docs/progress.md` "App-Shell Pages: Data, Reports, Alerts"), `/reports` also gained a real submission form (see "Report Submission Form"), and `/observations`, `/biodiversity`, `/restoration`, `/community` shipped with honest empty states since none of them had a backend yet (see "App-Shell Pages: Observations, Biodiversity, Restoration, Community"). `/observations`, `/restoration`, and `/biodiversity` have since been upgraded to real data as their backends shipped (M9 2026-08-17, M11 and M10 both 2026-08-19); only `/community` remained an honest empty state (since replaced by the Community module, 2026-09-01).
- ~~PostGIS geography fields~~ Partially done (2026-09-01) — point geometry on `District`. Polygon geometry still needed.

Exit criteria:

- ~~Citizens can submit reports and observations after login.~~ Done (2026-08-17) — both `POST /reports` (via `/reports`) and `POST /observations` (via `/observations`) work end to end, verified live with real submissions.
- ~~Public users see only verified/publishable data from the live API.~~ Met — public list endpoints filter by status (`VERIFIED`/`RESOLVED` for reports; `ACTIVE` for alerts; `RESEARCH_GRADE`/`COMMUNITY` for observations, excluding `FLAGGED`).
- ~~Moderators/admins can review and update status.~~ Met — confirmed working via `PATCH /reports/:id/status` and `PATCH /alerts/:id`. Was **not** true until 2026-08-17 due to the RBAC casing bug; see Phase 2 notes.
- ~~Advanced dataset access is gated correctly.~~ Met (2026-08-24) — all 5 access policies (`PUBLIC`, `LOGIN_REQUIRED`, `RESEARCHER`, `APPROVED`, `GOVERNMENT`) enforced on `GET /datasets/:id/download`.

## Phase 4: Data and Ingestion

Status: **Done** (closed 2026-09-01) — all core deliverables complete. `ApiCallLog` provider response logging and Python data-worker deliberately deferred to Phase 7; the "data lineage" exit criterion carries with them.

Goal: Bring real environmental data into the platform.

Deliverables:

- ~~OpenMeteo ingestion job~~ ✓ Done (2026-08-16) — weather + air quality; scope redesigned from original ingestion-plan (no job lifecycle or response logging in this pass). See `docs/progress.md` "Weather Ingestion".
- ~~Ingestion job lifecycle (queue, track, retry, audit)~~ ✓ Done (2026-08-24) — `IngestionService` + `IngestionController` implemented; weather and GBIF schedulers write `IngestionJob` records per run; `Dataset.lastSyncedAt` updated on success. No retry queue — cron re-runs serve as retry. See `docs/progress.md` "Ingestion Module + Dataset Access".
- ~~Provider response logging~~ — Deliberately skipped; no `ApiCallLog` model built. Deferred to Phase 7 as an infrastructure item alongside the Python data-worker.
- ~~Dataset version/distribution records~~ Done — `DatasetVersion` model (schema.prisma:853); `GET /datasets/:id/versions` and `POST /datasets/:id/versions` (admin, audited `DATASET_VERSION_PUBLISH`) both implemented.
- ~~Weather and air quality summaries populated from ingestion~~ ✓ Done — `GET /datasets/weather/current` and `GET /datasets/air-quality/current` return live data.
- ~~Python data-worker baseline for GIS/scientific processing~~ — Deliberately deferred; `apps/data-worker/` is a placeholder skeleton (pyproject.toml + empty main.py, no active jobs). Deferred to Phase 7.

Exit criteria:

- ~~Ingestion jobs can be queued, tracked, retried, and audited.~~ **Partially met** — jobs are tracked (RUNNING → SUCCEEDED/FAILED) and visible via `GET /ingestion/jobs`. No explicit retry queue (crons serve as periodic retry). `ApiCallLog` per-HTTP-call logging deferred to Phase 7.
- ~~Public dataset summaries use real backend records.~~ Met — weather/AQ summaries live; flood, radiation, marine, and biodiversity dataset records also seeded and `lastSyncedAt` updated on each run.
- Data lineage is stored for imported/derived datasets. — **Deferred to Phase 7** alongside `ApiCallLog`.

## Phase 5: Advanced Domains

Status: **Done** (closed 2026-09-01) — all deliverables complete.

Goal: Add richer product areas after the core is stable.

Deliverables:

- ~~Biodiversity taxonomy and occurrence model~~ Done (2026-08-19) — GBIF daily sync, species/occurrence endpoints, data hub preview.
- ~~Restoration/project domain~~ Done (2026-08-19) — CRUD, ownership-gated updates, idempotent join workflow.
- ~~Community posts, comments, and polls~~ Done (2026-09-01) — `CommunityPost`, `PostComment`, `Poll`, `PollOption`, `PollVote` models (5 new tables applied via psql); `CommunityModule` with controller + service + 3 DTOs; full CRUD (`GET/POST /community/posts`, `GET/DELETE /community/posts/:id`, `POST /community/posts/:id/comments`, `DELETE /community/posts/:id/comments/:commentId`, `POST /community/posts/:id/poll/vote`); `/community` page replaced from honest-empty-state to real post list + create form with optional poll block; `/community/:id` detail page with inline comments and poll voting (vote + change-vote); author/admin delete on posts and comments; 5 new `AuditAction` values.
- ~~Notification subscriptions~~ Done (2026-08-22) — `AlertSubscription` + email delivery via Nodemailer.
- ~~Environmental event/hazard history~~ — Removed from Phase 5. The historical record for discrete incidents is already covered by `CitizenReport` (FLOODING, WATER_POLLUTION, etc.), `Alert` lifecycle (EXPIRED/CANCELLED), and `WaterLevelReading` archives. The full feature — unified event lifecycle with onset/peak/recovery, multi-source correlation (reports + readings + forecasts + alerts), impact records, and recurrence history — is a cross-domain synthesis problem that belongs in Phase 9. See "Hazard Event History" entry there.
- ~~Researcher and government role-scoped workflows~~ Done — analytics endpoints for government/researcher/orgadmin.
- ~~Profile completeness scoring and badge system (gamification)~~ Done (2026-08-29) — `GET /gamification/me`; 10 completeness checks; 5 badge categories × 4 tiers (Bronze/Silver/Gold/Emerald); BullMQ `gamification` queue with dedup by userId; earned badges stored on `UserProfile`.

Exit criteria met:

- ~~Delta Signal can connect evidence, measurements, reports, alerts, projects, and outcomes.~~ **Met** — citizens submit reports/observations; restoration projects link participants; community posts attach to districts; all cross-referenced by user.
- ~~Advanced domains remain modular and do not overload generic observations.~~ **Met** — `community`, `gamification`, `notifications`, `biodiversity`, `restoration`, `analytics` each own their schemas and endpoints.

## Phase 6: Production Hardening

Status: Done — 6a security (2026-08-21), 6b test suite + CI + API contract enforcement (2026-08-21/22), 6c notification delivery (2026-08-22), 6d Dockerfiles (2026-08-22), e2e tests (2026-09-02), dashboard presentation refresh (2026-09-17). Remaining: accessibility pass.

Goal: Prepare the system for real users and operational trust.

Ordered roughly by risk: the security items are cheap and block any real deployment, the test/CI items protect the 60% already built, and notification delivery closes the one gap that undermines a shipped feature.

### 6a. Security must-fixes — Done (2026-08-21)

- ~~**Fail fast on a missing `JWT_SECRET`.**~~ Done (2026-08-21). `common/env.validation.ts` is wired into `ConfigModule.forRoot({ validate })`; both call sites now use `getOrThrow`, so no fallback exists. Rejects missing, empty, whitespace-only, known placeholders, and anything under 32 characters, and `JWT_SECRET` is documented in `.env.example`.
- ~~**Add `helmet`.**~~ Done (2026-08-21). `helmet` installed and called in `main.ts` before routing, so every response — including error responses — carries security headers.
- ~~**Add rate limiting (`@nestjs/throttler`).**~~ Done (2026-08-21). `ThrottlerModule` registered globally at 120 req/60 s baseline. Auth routes tightened via `@Throttle`: `/auth/login` and `/auth/register` at 5 req/60 s (brute-force surface), `/auth/refresh` at 20 req/60 s (legitimate clients refresh every ~15 min). `ThrottlerGuard` registered via `APP_GUARD` in `AppModule` so it receives DI.
- ~~**Audit failed logins.**~~ Done (2026-08-21). `AuditAction.USER_LOGIN_FAILED` added via additive migration `20260820200435_add_user_login_failed_audit_action`. `AuthService.recordFailedLogin()` writes the event before throwing — fires on unknown email (no `userId`, email in meta) and on bad password / deactivated account (real `userId`, reason in meta). Five regression tests added to `auth.service.spec.ts` covering all three failure branches, caller-IP capture, and the invariant that `USER_LOGIN` is never written on a failed attempt.

### 6b. Regression safety net

- ~~First test suite covering `auth` and RBAC.~~ Done (2026-08-21). 52 tests across `RolesGuard`, `JwtAuthGuard`, `AuthService`, the refresh-token utilities and env validation. Fully mocked — no database needed. Each historical bug has a named regression test, and all six were mutation-checked: reintroducing the bug makes the suite fail. Expanded to 153 tests in 11 spec files (2026-08-29) — reports, observations, restoration, notifications, gamification, media service coverage added.
- ~~CI on pull requests.~~ Done (2026-08-21); updated (2026-08-29) to add `pnpm audit --prod --audit-level=high` in the `verify` job and a parallel `docker-build` job (`docker build -f apps/api/Dockerfile`). Note the repo has no git remote yet, so nothing runs until one is added.
- ~~Install a working lint setup.~~ Done (2026-08-21). `.eslintrc.json` added for `apps/api`, `apps/web`, and `apps/admin`. `pnpm lint` now runs cleanly across all three apps; added to local verification workflow but deliberately kept out of CI until the rule set is stable.
- ~~API contract tests.~~ Done (2026-08-22). `@delta-signal/contracts` added as a devDependency to `apps/api`. `src/common/contract-types.typecheck.ts` uses TypeScript's structural type system to assert that every service's return type (after JSON serialisation — `Date`→`string` via a `Jsonified<T>` utility) is assignable to its contract type. Checked by the existing `tsc --noEmit` step in CI. Also fixed `include`→`select` discipline in `datasets.service.ts`, `reports.service.ts` (`getById`), `alerts.service.ts` (`getById`), and four weather read methods — eliminating unintended field leakage (e.g. `createdAt` from weather readings not in the contract).
- ~~End-to-end tests for the public and authenticated flows.~~ Done (2026-09-02) — 45 tests across 4 spec files (`health.e2e-spec.ts`, `auth.e2e-spec.ts`, `public.e2e-spec.ts`, `protected.e2e-spec.ts`). Full NestJS app bootstrapped against a real database; BullMQ and throttler stubbed. Covers auth register/login/refresh/logout token lifecycle, all public read endpoints, CITIZEN/RESEARCHER/MODERATOR/ADMIN authenticated flows, and role/permission enforcement. CI `e2e` job added with a postgres:16 service container and `prisma migrate deploy`. See `docs/progress.md` "2026-09-02 E2E Test Suite".
- Accessibility pass.

### 6c. Notification delivery — Done (2026-08-22)

- ~~Per-user contact details plus verification.~~ Done — reused the existing `User.email` (already verified via login). No separate `notifyEmail` field needed for v1.
- ~~Transport for at least one channel.~~ Done — Nodemailer SMTP email. Optional: API starts without SMTP configured (one-time warn, sends silently skipped).
- ~~Delivery on `ACTIVE` alert transitions.~~ Done — `AlertsService.create()` (always ACTIVE) and `AlertsService.update()` (DRAFT → ACTIVE) both fire `notificationsService.dispatchForAlert()`, which creates PENDING `NotificationDelivery` records and enqueues per-user jobs via the BullMQ `email` queue (4-attempt exponential backoff).
- ~~Delivery status recorded so a failed send is visible rather than silent.~~ Done — `NotificationDelivery` records written as `PENDING` before enqueue, updated to `SENT` or `FAILED` by the `EmailProcessor`.
- ~~The `Notification` subscription model.~~ Done — `AlertSubscription` with districtId (nullable = nationwide), minSeverity threshold, and channel.

See `docs/progress.md` "Phase 6c: Notification Delivery" for design decisions and implementation detail.

Remaining gap: no SMS channel (EMAIL only). Government agency and emergency broadcast integration is Phase 7.

### 6d. Operations

- ~~Dockerfile for `apps/api`, `apps/web`, `apps/admin`.~~ Done (2026-08-22) — multi-stage Dockerfiles for all three, standalone Next.js output, `prisma migrate deploy` entrypoint, `docker-compose.prod.yml` with healthcheck-gated startup. Bug fix (2026-08-24): admin service was missing `API_URL` in `docker-compose.prod.yml` — would have caused all admin API calls to silently fail in production.
- ~~Deployment documentation and a repeatable path.~~ Done (`infrastructure/docker/README.md`). Single-host compose only; multi-host deferred.
- Backup/restore plan. — Not done.
- Observability. Audit *writes* are complete; a dashboard over `AuditEvent` is still missing.
- ~~Secure file/media handling~~ Done (2026-08-29) — `media` module fully implemented with `StorageService`, `MediaService`, `POST /media/upload`, `POST /media/presign`.

Exit criteria:

- ~~No secret falls back to a hardcoded default.~~ **Met** (2026-08-21) — see 6a.
- ~~Auth and RBAC have automated test coverage, and CI runs on every PR.~~ **Met** (2026-08-21) — pending a git remote for CI to actually execute.
- ~~Brute-force attempts leave a visible audit trail.~~ **Met** (2026-08-21) — `USER_LOGIN_FAILED` written on every rejected login; see 6a.
- ~~An `EMERGENCY` alert reaches a subscribed user, and a failed delivery is visible.~~ **Met** (2026-08-22) — `NotificationDelivery` records track PENDING→SENT/FAILED per user per alert; `EmailProcessor` writes status on success/failure; BullMQ retries up to 4 times with exponential backoff.
- Public and authenticated flows are tested. — **Met** (2026-09-02). 153 unit tests (11 spec files) + 45 e2e tests (4 spec files) covering public endpoints, auth token lifecycle, and CITIZEN/RESEARCHER/MODERATOR/ADMIN role + permission flows against a real database. `apps/web` and `apps/admin` still have no tests.
- Sensitive actions are auditable. — **Met** (complete as of 2026-08-27). All 25 `AuditAction` values are written. Every implemented mutating endpoint audits.
- ~~Deployment and operations are repeatable.~~ **Met** (2026-08-22) — multi-stage Dockerfiles for all three apps; `docker-compose.yml` with Mailpit, Redis, API, web, and admin services; healthcheck-gated startup; `prisma migrate deploy` entrypoint in the API container.

---

## Phase 7: Advanced Platform Domains

Status: In Progress — 3 of 12 domains complete. Emissions tracking (World Bank API), satellite radiation, and marine weather done. Frontend: `/emissions` page live (2026-09-02 rewrite). Remaining frontend gap: radiation and marine data have no public web page yet — data is collected by cron jobs but not visible to users. Priority before adding new domains: surface radiation and marine data in `apps/web`. Remaining 9 domains (Industrial Facility Registry, ApiCallLog, structured surveys, climate forecasting, seasonal forecasting, carbon accounting, research platform, Python data-worker, satellite/remote sensing) still planned.

Goal: Extend Delta Signal into the richer environmental science domains that the core platform was designed to support but that require deeper infrastructure, specialist data sources, or a larger user base before they pay off. Each domain here either has a clear data dependency on Phase 3–6 work, or requires specialist review before scoping.

Order is not fixed. Satellite ingestion is the most infrastructure-heavy and depends on PostGIS, media storage, and the Python data-worker all landing first, so it is likely last.

| Domain | What it adds | Status |
| --- | --- | --- |
| **Emissions tracking** | National GHG emissions ingested from the World Bank Climate Change API — 4 indicators (Total GHG, CO₂, CH₄, N₂O), 1976–2024, weekly sync. `NationalEmissionReading` model, `WorldBankClient`, `EmissionsScheduler`. Frontend `/emissions` page with time-series table. Initial user-input design (2026-08-28) superseded by API ingestion (2026-09-02). | **Done (2026-09-02)** |
| **Satellite radiation data** | Daily solar radiation totals, sunshine duration, and daylight duration for all 64 districts via OpenMeteo Satellite API. `SatelliteRadiationReading` model, `RadiationScheduler`. | **Done (2026-08-28)** |
| **Marine weather data** | Bay of Bengal wave/swell/wind-wave forecasts for coastal Bangladesh districts via OpenMeteo Marine API. `MarineForecast` model, `MarineScheduler`. | **Done (2026-08-28)** |
| **Industrial Facility Registry** | Searchable directory of factories, garment units, brick fields, tanneries, power plants, shipbreaking yards, and other industrial sites that have measurable environmental impact. Each facility carries type, compliance status, operator, and full geographic anchor (district → upazila → union → lat/lng/PostGIS). Links to `CitizenReport` (incidents at that facility) and exposes a `GET /facilities/nearby` spatial search. Government/admin registers facilities; researchers and moderators can update compliance status; the public can browse and filter. Inspection records (date, outcome, inspector) are a v2 addition. | *Planned* |
| **Climate forecasting** | Platform-generated predictions (flood risk, drought early warning, heat index). Adds a model registry, prediction storage, and accuracy tracking — separate from the provider forecasts already in `HourlyWeatherForecast`/`DailyWeatherForecast`. | *Planned* — requires Python data-worker + ML pipeline |
| **Seasonal forecasting** | Planning-oriented integration of OpenMeteo EC46/SEAS5 weekly and monthly ensemble forecasts, anomalies, and uncertainty indicators. Starts at district/division or river-basin scale; does not replace official BMD/FFWC warnings or local observations. | *Deferred* — implement after core response workflows and official Bangladesh data integrations are stronger |
| **Carbon accounting** | Per-user and per-organisation footprint entries with calculation methodology and offset tracking. `HourlyAirQuality.carbonMonoxide` is a pollutant measurement and unrelated to this feature. | *Planned* |
| **Research platform** | Publication records, authorship, citations, and institution linkage. Gives the `RESEARCHER` role a meaningful place to publish and cite findings from the platform's own data. | *Planned* |
| **Structured surveys** | Solicited, structured data collection campaigns. Distinct from `CitizenReport` (unsolicited incident reporting) and `Observation` (point-in-time measurements) — surveys target specific questions with a defined form schema and response lifecycle. | *Planned* |
| **Satellite / remote sensing** | Satellite imagery ingestion (NASA MODIS, Sentinel-2), change-detection analysis, and automated deforestation/flooding alerts. Fills the gap where `DEFORESTATION` and `FLOODING` report categories currently only have citizen-reported evidence. | *Planned* — requires PostGIS geometry fields, object storage, Python data-worker |
| **Python data-worker** | GIS and scientific processing jobs — initially: spatial joins, land-cover analysis, change-detection, and ML pipeline scaffolding. `apps/data-worker/` is a placeholder skeleton today (pyproject.toml + empty main.py). Must be operational before satellite/remote sensing or climate forecasting can land. Deferred from Phase 4. | *Planned* — prerequisite for satellite ingestion and climate forecasting |
| **Provider response logging (`ApiCallLog`)** | Per-HTTP-call log of every external API request — URL, provider, status code, latency, response size, error. Enables data lineage tracking for imported datasets and supports debugging of ingestion failures beyond what `IngestionJob` run-level tracking provides. No `ApiCallLog` model currently exists in the schema. Deferred from Phase 4. | *Planned* |

### Seasonal Forecast Decision

The OpenMeteo Seasonal Forecast API is strategically relevant because it adds
forward-looking planning context to Delta Signal's current-condition,
historical, and short-range forecast data. It is intentionally deferred as a
full ingestion module until the platform has stronger official Bangladesh
source integrations and a complete report-to-agency response loop.

When implemented, the first version should:

- use weekly/monthly ensemble mean, anomaly, and spread data;
- target districts, divisions, or river basins rather than imply union-level
  precision from the approximately 36 km model grid;
- store forecast issue time, target period, model, and provenance;
- display uncertainty and clearly distinguish model outlooks from observations
  and official warnings; and
- support government preparedness, agriculture, restoration, research, and
  drought/flood context rather than automatically creating emergency alerts.

Exit criteria:

- Each domain has a schema, at least one public read endpoint, and one write endpoint before the phase closes.
- Satellite ingestion has a running proof-of-concept change-detection job on at least one district.
- Research publications are searchable and linkable to dataset records and observations.

---

## Phase 8: Land, Forest & Agricultural Intelligence

Status: *Planned* — two independent tracks, different blockers:

**Data-sourcing track (can begin now):** Forest registry, crop catalog, AEZ definitions, crop calendar, and agricultural production statistics are reference-data modules. They depend on securing verified national datasets (BARC/FAO for AEZ, BBS/DAE for crop geography, SRDI for soil reference, Forest Department for forest inventory) — not on Phase 7 infrastructure. These can be scoped and seeded as soon as source data is available.

**Infrastructure-dependent track:** Crop suitability analysis, land-cover change detection, and satellite forest monitoring depend on PostGIS polygon geometry (Phase 7 infrastructure item), a working Python data-worker (Phase 7 prerequisite), and at least two years of land-cover reference data. These should not be started until Phase 7's satellite/remote sensing proof-of-concept is stable.

Goal: Establish structured environmental data layers for Bangladesh's forests, land cover, and agricultural geography. The product boundary is explicit: this phase captures how environment, climate, land, water, and soil shape agricultural areas of Bangladesh — it does not build farm-management software, farmer ERP, or any commercial agricultural tooling. Delta Signal describes the environmental system; it does not manage the farmer's response to it.

### Forest & Protected Areas

| Domain | What it adds | Status |
| --- | --- | --- |
| **Forest Registry** | Structured records for Bangladesh's named forest areas: English and Bangla names, ecosystem type, geographic extent (linked to existing division/district/upazila/union records), total area, managing authority, conservation status, dominant vegetation, biodiversity significance, known environmental threats, and source provenance. Each forest record links to existing biodiversity observations, citizen deforestation reports, restoration projects, and any active alerts covering that geographic area. Boundary geometry stored via PostGIS when polygon data is available; lat/lng centroid used as fallback. | *Planned* |
| **Forest Classification** | Ecological type system for Bangladesh's forest cover: mangrove, hill forest, Sal (*Shorea robusta*), freshwater swamp forest, coastal plantation, plantation/afforestation, homestead/village forest, and other relevant ecosystem classes. Ecosystem type is an attribute of a forest record — distinct from its legal protection status. | *Planned* |
| **Protected Areas Registry** | Legal and conservation designation records — national park, wildlife sanctuary, reserved forest, protected forest, eco-park, Ramsar wetland site, UNESCO World Heritage site, and other nationally or internationally designated areas. Separate concept from forest ecosystem type: the Sundarbans is both a mangrove ecosystem and a UNESCO World Heritage Site; a Sal forest may or may not carry any legal designation. | *Planned* |

### Land Cover

| Domain | What it adds | Status |
| --- | --- | --- |
| **Land Cover Reference Datasets** | National land cover classification datasets by year — forest, cropland, wetland, water, urban/built-up, grassland, bare land, mangrove, plantation, and other classes. Sourced from publicly available national surveys or international remote sensing products (SERVIR-Mekong, Global Forest Watch, or equivalent). District- and upazila-level summaries in the Data Hub, with explicit source and year provenance. PostGIS polygon geometry is the eventual geospatial basis for spatial intersection queries; administrative-unit aggregations are available before polygon geometry lands. | *Planned* — requires a sourced national or international land cover dataset |

### Agricultural Environment

| Domain | What it adds | Status |
| --- | --- | --- |
| **Crop Catalog** | Reference records for Bangladesh's agricultural crops: name, Bangla name, scientific name where applicable, category (cereal, pulse, oilseed, vegetable, fruit, spice, fiber, cash crop, plantation, fodder, other), growing season, typical growth duration, and environmental requirements — water, temperature, rainfall, soil type and pH preference, salinity tolerance, flood tolerance, drought tolerance. Records carry source and provenance; no suitability claim is made without supporting evidence. | *Planned* |
| **Crop Geography** | District- and upazila-level crop distribution sourced from Bangladesh Bureau of Statistics (BBS) agricultural census data or DAE seasonal crop reports. Supports geographic questions such as "what crops are cultivated in this upazila?" and "where is boro rice production concentrated?" Versioned by source and year; the platform does not invent crop geography. | *Planned* |
| **Agro-Ecological Zones (AEZ)** | Bangladesh's 30 agro-ecological zone boundaries as a named geographic layer — characterised by soil type, drainage class, flood regime, elevation band, and climatic conditions. Each AEZ links to its intersecting districts and upazilas, typical crop associations, and agricultural limitations. Provides a scientific basis for crop suitability analysis beyond administrative-boundary heuristics. Source: BARC/FAO AEZ classification for Bangladesh. | *Planned* |
| **Agricultural Production Statistics** | Crop production data in the Data Hub: cultivated area, harvested area, total production, and yield per crop, season, year, and administrative unit (division, district, upazila where data exists). Sources: BBS Agricultural Sample Survey, DAE seasonal reports. Stored with explicit source, methodology, and reference period. Enables production trend analysis and region-level comparisons; does not project future output. | *Planned* |
| **Soil Reference Data** | District- and upazila-level soil characterisation layer — texture class, drainage class, pH range, salinity class, and organic matter content — sourced from SRDI (Soil Resource Development Institute of Bangladesh). Stored as a reference layer, not a farm-level soil test or fertilizer prescription tool. Feeds into crop suitability analysis and AEZ descriptions. | *Planned* — requires sourced SRDI data |
| **Crop Calendar** | Regional and AEZ-level crop calendars for Bangladesh's major crops (Boro, Aus, Aman, wheat, jute, potato, mustard, and others) covering land preparation, sowing, growing, and harvesting stages with approximate date ranges by region. Connects to Delta Signal's existing weather and flood data for seasonal environmental context. | *Planned* |

Exit criteria:

- The forest registry covers Bangladesh's major forest areas — Sundarbans, Chittagong Hill Tracts forests, Madhupur Sal forest, Ratargul swamp forest — and principal protected areas, with verified source records for each.
- The crop catalog covers Bangladesh's 30+ most agriculturally significant crops, including all major seasonal crops (Boro, Aman, Aus, jute, wheat, potato, mustard), with environmental attribute coverage and source provenance.
- All 30 AEZs are ingested, linked to their intersecting districts and upazilas, and publicly accessible.
- Agricultural production statistics for at least 3 reference years are in the Data Hub for major crops, with source and year clearly displayed.
- Soil reference characterisation is available at district level for all 64 districts.
- Crop calendars exist for Boro, Aman, Aus, and wheat across the major AEZ groups.
- All records carry explicit source provenance — no data is presented without attribution.

---

## Phase 9: Cross-Domain Environmental Intelligence

Status: *Future* — depends on Phase 8 (forest registry, AEZ, crop catalog, soil reference, land cover datasets), Phase 7 satellite/remote sensing foundation, PostGIS polygon geometry, Python data-worker, and a stable Phase 6 production environment.

Goal: Derive actionable environmental intelligence by connecting Delta Signal's existing domains — climate, weather, flood, water, biodiversity, citizen reports, restoration — with the land, forest, soil, and agricultural layers from Phase 8. This phase shifts from data accumulation to cross-domain synthesis. Outputs remain environmental intelligence with stated methodology and confidence; they do not become guaranteed farming advice or automated regulatory decisions.

### Forest Intelligence

| Domain | What it adds | Status |
| --- | --- | --- |
| **Forest Condition Indicators** | Periodic structured indicators per forest registry record: estimated cover, canopy condition, encroachment and clearing reports (drawn from the existing citizen deforestation report workflow), fire incident records, and restoration activity within the forest's geographic boundary. Sourced from national forest assessments, citizen data, and MODIS-derived annual products where available. Not real-time satellite analysis — that belongs to the satellite-derived monitoring entry below. | *Future* |
| **Satellite-derived Forest Monitoring** | Forest-change detection layered onto the forest registry using MODIS or Sentinel-2 derived products — identifying anomalous tree-cover loss within a monitoring window at district or forest-area level. Triggers an alert linked to the relevant forest record and any citizen deforestation reports in that area when a defined change threshold is crossed. Builds on Phase 7's satellite/remote sensing infrastructure and change-detection proof-of-concept; does not duplicate or replace it. | *Future* — depends on Phase 7 satellite/remote sensing, PostGIS polygon geometry, Python data-worker |

### Land Cover Intelligence

| Domain | What it adds | Status |
| --- | --- | --- |
| **Land Cover Change Detection** | Year-on-year land cover transition analysis — forest-to-cropland conversion, cropland-to-urban conversion, wetland loss, mangrove area change, and agricultural land loss — exposed as district-level trend summaries and Data Hub dataset downloads. Requires at least two comparison years of land cover datasets from Phase 8 and PostGIS polygon geometry for spatial intersection. | *Future* — depends on ≥2 years of Phase 8 land cover datasets and PostGIS polygon geometry |

### Agricultural Environmental Intelligence

| Domain | What it adds | Status |
| --- | --- | --- |
| **Crop Suitability Analysis** | Evidence-based environmental suitability assessment combining crop requirements (crop catalog) with AEZ classification, soil reference data, 30-day climate averages, and flood risk from the existing flood module. Outputs a suitability signal (very high / high / moderate / low / unsuitable) per crop × AEZ × season, with limiting factors explained and methodology stated. Presented as environmental intelligence, not guaranteed agricultural advice; confidence level is always disclosed. | *Future* — depends on AEZ, soil reference, and crop catalog from Phase 8; flood and climate data are already available |
| **Agricultural Climate & Hazard Risk** | Seasonal risk summaries for agricultural areas combining existing weather forecasts, flood forecasts, and historical climate patterns with crop calendar context. Risk dimensions include flood, flash flood, waterlogging, drought, heat stress, cold stress, cyclone, storm surge, salinity, and high wind. Example: "Aman rice in Sylhet Division is approaching the tillering stage during a period with elevated river discharge and above-average rainfall forecast." Risk is presented as a probabilistic signal, not a certain crop-loss prediction. | *Future* — depends on crop calendar (Phase 8), AEZ, and existing flood/weather modules |
| **Agricultural Incident Observations** | Extension of the existing Observation model with crop-specific incident categories: crop flood damage, waterlogging, drought stress, salinity impact, pest outbreak (where reliable public data exists), crop disease, storm damage, and irrigation shortage. Observations carry crop name, variety if known, growth stage, approximate affected area, and severity. Submitted through the existing observation workflow and reviewed by the same moderator queue — no separate farmer-reporting platform. Spatiotemporal clustering of verified agricultural incidents produces district-level agricultural stress signals. | *Future* — extends existing Observation and CitizenReport infrastructure; does not create a parallel reporting system |

### Hazard Event History

| Domain | What it adds | Status |
| --- | --- | --- |
| **Environmental Hazard Event Timeline** | A unified `HazardEvent` model that gives a named environmental event — a flood, cyclone, heatwave, drought, or pollution incident — a coherent record across its full lifecycle: onset date, peak date, recovery date, event type, severity progression, and geographic extent. Correlates existing data sources into a single event narrative: citizen reports filed during the event, alerts issued, water level readings at peak, weather and flood forecast accuracy. Impact records (estimated affected population, crop loss, infrastructure damage) stored as structured fields, not free text. Enables recurrence analysis ("3rd major flood in Sylhet in 5 years"), alert justification ("Alert X was issued because of Event Y"), and temporal queries ("what hazard events occurred in District X between 2022 and 2024?"). Does not replace `CitizenReport`, `Alert`, or sensor readings — synthesises them. | *Future* — depends on stable multi-year data across flood, weather, water level, and citizen report streams; benefits from PostGIS polygon geometry for event area delineation |

### Geographic Place Intelligence

| Domain | What it adds | Status |
| --- | --- | --- |
| **Integrated Geographic Views** | District, upazila, and union detail pages evolve into full environmental system views of a place: climate summary, weather, water and flood conditions, forest and protected area proximity, land cover composition, biodiversity highlights, AEZ characteristics, crop calendar, crop distribution, crop suitability signals, pollution sources, citizen reports, restoration projects, active alerts, and hazard event history — integrated rather than siloed by dataset category. The goal is for Delta Signal to describe the environmental system of a place, not merely a list of data layers for that coordinate. | *Future* — depends on Phase 8 and Phase 9 cross-domain data being available for the same geographic units |

Exit criteria:

- Forest condition indicators update at least quarterly and reflect current citizen-report data from the deforestation report category for monitored forest areas.
- Satellite-derived forest monitoring produces at least one end-to-end monitored forest area with working threshold alerting.
- Land cover change is computable across ≥2 comparison years for all 64 districts.
- Crop suitability scores exist for Bangladesh's 5 most agriculturally significant crops across all 30 AEZs, with stated methodology and limiting-factor explanations.
- Agricultural climate risk context appears on district pages during the active crop calendar period, linked to the forecast source.
- Agricultural incident observations flow through the existing moderation workflow and produce spatially clustered signals at district level.
- Hazard event history covers at least 3 years of major flood and cyclone events for Bangladesh, with linked citizen reports, water level readings, and issued alerts per event.
- District pages surface ≥5 distinct Phase 8/9 environmental domains in an integrated, non-siloed view.

---

## Long-term Intelligence Direction

Not a committed roadmap phase. These represent the aspirational horizon — directional signals that should inform architectural decisions without being treated as near-term deliverables. Each requires validated data foundations, specialist domain partnerships, or independent scientific methodology review before any public-facing claim is made.

- **Explainable environmental risk models** — Decision-support outputs that explain, step by step, why a crop area, forest, or watershed is at environmental risk, drawing on multiple Delta Signal data streams with transparent methodology. Requires scientific validation partnerships before deployment.
- **Forecast-driven agricultural advisories** — Seasonal advisories connecting weather and flood forecasts to crop calendar stage and crop environmental requirements for specific regions. Requires validated agricultural science partnerships and clear disclaimers before moving beyond informational context.
- **Forest and ecosystem health composite indicators** — Per-forest-area health signals derived from canopy cover trends, encroachment and fire signals, biodiversity observation density, restoration activity, and alert history — synthesised into a readable condition summary rather than a raw data list.
- **Satellite and citizen-report cross-validation** — Comparing citizen deforestation and encroachment reports against satellite-derived change signals to identify probable confirmations and reduce false positives in both data streams.
- **Historical agricultural and environmental correlation analysis** — Multi-year analysis connecting flood exposure, precipitation trends, temperature change, land-cover shifts, and AEZ characteristics with production statistics. Intended as a research-grade tool with explicit methodology disclosure, not a yield forecast product.
- **Cross-domain geographic intelligence** — A district or union view that narrows to a specific season and synthesises all Delta Signal data streams into a coherent environmental narrative of that place at that time, readable without domain expertise.

None of these should be built before the Phase 8 data foundations and Phase 9 cross-domain infrastructure are stable and independently validated.

---

## Platform Scope Boundaries

Delta Signal is an environmental and geographic intelligence platform. The following are explicitly outside scope — building them would shift Delta Signal into a different product category and dilute its core identity as a civic environmental intelligence layer.

**Agricultural and farm operations** — Delta Signal describes how the environment shapes agriculture; it does not manage what farmers do about it. Out of scope: farm accounting, crop planning software, precision agriculture advisory, fertilizer or seed recommendations without validated scientific methodology, agricultural input procurement, seed or fertilizer ecommerce, crop commodity trading, farmer loan origination or credit scoring, machinery rental, warehouse management, agricultural logistics, and farm-level workforce management. These could be built as separate products consuming Delta Signal's public environmental APIs and open datasets.

**Industrial operations** — The `emissions` module ingests national-level GHG data from the World Bank as environmental monitoring data. It is not an industrial ERP, a regulatory compliance filing system, a production management tool, or a B2B industrial services directory.

**Commercial platforms** — Delta Signal does not provide a marketplace, a transactional layer, a commercial subscription product for businesses, or a payment rail of any kind.

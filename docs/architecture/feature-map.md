# Feature Map

Delta Signal's feature set is organised by domain area. Status reflects what is built and live as of the last progress update — see `docs/progress.md` for detail on each item.

Legend: **Done** | **Partial** | *Planned* | ~~Deferred~~

---

## Foundation

| Feature | Module / App | Status |
| --- | --- | --- |
| Authentication (register, login, JWT, refresh, logout) | `auth` | **Done** |
| Users and role management | `users` | **Done** |
| Organizations | `organizations` | **Done** |
| Administrative geography (divisions, districts, upazilas, unions) | `locations` | **Done** |
| Shared type contracts and route map | `packages/contracts` | **Done** |
| Database schema and migrations | `packages/database` | **Done** |
| Audit trail (`AuditEvent` on all mutations) | `common` | **Done** |
| Security headers, rate limiting, JWT secret validation | `common` | **Done** |
| Automated tests (auth, RBAC, env validation, reports, observations, restoration, notifications, gamification, media) | `apps/api` | **Done** — 153 tests in 11 spec files |
| CI pipeline | `.github/workflows/ci.yml` | **Done** — awaits git remote |
| Production Dockerfiles | `infrastructure/docker` | **Done** |

---

## Environmental Data

| Feature | Module / App | Status |
| --- | --- | --- |
| Weather ingestion — current, hourly, daily (OpenMeteo) | `weather` | **Done** |
| Air quality ingestion — hourly (OpenMeteo) | `weather` | **Done** |
| Flood discharge forecasts — station-based (OpenMeteo/GloFAS) | `flood` | **Done** — refactored to `StationFloodForecast` per water level station; district-level proxy replaced by station FK |
| Satellite radiation — daily shortwave, sunshine, daylight (OpenMeteo) | `radiation` | **Done** |
| Marine wave/swell/wind-wave forecasts — coastal districts (OpenMeteo) | `marine` | **Done** |
| Location climate rolling averages — 30-day, union→district→division (OpenMeteo) | `locations/climate` | **Done** |
| Urban AQI — station-level (WAQI) | `weather` | *Planned* — free key needed at aqicn.org |
| Dataset catalog with access policy | `datasets` | **Done** — 9 catalog records |
| Dataset download + access request endpoints | `datasets` | **Done** |
| Dataset version history and publishing | `datasets` | **Done** — `DatasetVersion` model; `GET/POST /datasets/:id/versions`; audited `DATASET_VERSION_PUBLISH` |
| Biodiversity — species and occurrence records (GBIF daily sync) | `biodiversity` | **Done** |
| Ingestion job lifecycle (queue, track, retry, audit) | `ingestion` | **Partial** — job tracking implemented (RUNNING → SUCCEEDED/FAILED); no retry queue or manual trigger endpoint |
| Water body registry (rivers, haors, canals, lakes) with monitoring stations | `water-bodies` | **Done** — `WaterBody`, `WaterLevelStation`, `WaterLevelReading`; seeded from CSV |
| Water level readings and gauge threshold status | `flood`, `water-bodies` | **Done** — `GET /flood/stations/:stationId/readings`, `GET /flood/stations/:stationId/latest` |
| BMD / FFWC government data | `ingestion` | *Planned* — requires gov access or scraping |

---

## Citizen Engagement

| Feature | Module / App | Status |
| --- | --- | --- |
| Citizen report submission and tracking | `reports` | **Done** |
| Report status workflow (moderation → verified → resolved) | `reports` | **Done** |
| Report comments (public + internal moderator notes) | `reports` | **Done** |
| Report media attachments (URL registration) | `reports` | **Done** |
| Report media upload (file storage) | `reports`, `media` | **Done** — `POST /media/upload` (multipart) and `POST /media/presign` (presigned URL); requires `STORAGE_*` env vars |
| Environmental observations with trust levels | `observations` | **Done** |
| Quantitative observation measurements (water/air/soil/biodiversity parameters) | `observations` | **Done** — `ObservationMeasurement` with `MeasurementParameter`, `MeasurementUnit`, `QualityFlag` |
| Restoration project creation, tracking, and joining | `restoration` | **Done** |
| Restoration targets, activity logs, and metric readings | `restoration` | **Done** — `ProjectTarget`, `ProjectActivity`, `ProjectMetric`; `RestorationTargetMetric` enum |
| Structured survey campaigns | — | *Planned* (Phase 7) |
| Community posts, comments, and polls | `community` | **Done** (2026-09-01) — `CommunityPost`, `PostComment`, `Poll`, `PollOption`, `PollVote` models; full CRUD + `/poll/vote` with upsert (change-vote); author/admin delete; `/community` list + create form; `/community/:id` detail with comments and poll |
| Profile completeness scoring and badge system | `gamification` | **Done** (2026-08-29) — `GET /gamification/me`; 10 completeness checks; 5 badge categories × 4 tiers (Bronze / Silver / Gold / Emerald); BullMQ `gamification` queue with deduped evaluation |

---

## Alerts and Notifications

| Feature | Module / App | Status |
| --- | --- | --- |
| Environmental alerts (create, severity, lifecycle) | `alerts` | **Done** |
| Alert subscription (district or nationwide, min severity) | `notifications` | **Done** |
| Email delivery on alert activation | `notifications` | **Done** — dispatched via BullMQ `email` queue (PENDING `NotificationDelivery` records enqueued per user) |
| SMS / multi-channel delivery | `notifications` | *Planned* (Phase 7) |
| Government / emergency broadcast integration | `notifications` | *Planned* (Phase 7) |

---

## Industrial Sites

| Feature | Module / App | Status |
| --- | --- | --- |
| Company registry (legal entities, subsidiaries, HQ district) | `companies` | **Done** (2026-09-02) — `Company` model with self-referential parent/subsidiary; 42 seed records |
| Industrial facility registry (type, compliance, ETP, capacity) | `companies` (seeded via `CompaniesService.onModuleInit`) | **Done** (2026-09-02) — `IndustrialFacility` model; 44 seed records; linked to company via FK |
| Public tabbed Industry page (sites + companies, URL-param tabs) | `apps/web /industrial-sites` | **Done** (2026-09-02) — `?tab=companies` switches views; filter forms preserve tab; `/industrial-sites/companies/:id` and `/industrial-sites/:id` detail pages |
| DoE compliance status tracking | `companies` | **Partial** — `ComplianceStatus` field exists; no automated sync with DoE data |
| Facility emission / discharge records | — | *Planned* (Phase 7) |

---

## Platform Intelligence

| Feature | Module / App | Status |
| --- | --- | --- |
| Live platform metrics | `metrics` | **Done** |
| National GHG emissions (World Bank Climate Change API) | `emissions` | **Done** — `NationalEmissionReading` model; 4 GHG indicators (Total GHG, CO₂, CH₄, N₂O); weekly scheduler; `/emissions` frontend page |
| Climate forecasting and ML predictions | `data-worker` | *Planned* (Phase 7) |
| Carbon footprint accounting | — | *Planned* (Phase 7) |

---

## Research and Governance

| Feature | Module / App | Status |
| --- | --- | --- |
| Research publication records | — | *Planned* (Phase 7) |
| Dataset access request workflow | `datasets` | **Done** — `POST /datasets/:id/access-request`, admin list + approve/reject |
| Government and researcher role-gated datasets | `datasets` | **Done** — all 5 access policies enforced on `GET /datasets/:id/download` |

---

## Geospatial

| Feature | Module / App | Status |
| --- | --- | --- |
| District-level point coordinates (lat/lng) | `locations` | **Done** — all 64 districts backfilled |
| PostGIS point geometry on District | `packages/database` | **Done** — `District.geom geography(Point, 4326)` added by migration `20260901000000_postgis_geometry` |
| PostGIS polygon geometry (boundaries, alert zones) | `packages/database` | *Planned* — boundary data exists as `Json?`; polygon type not yet applied |
| Satellite / remote sensing ingestion | `data-worker` | *Planned* (Phase 7) — depends on PostGIS + object storage |
| Change detection (deforestation, flooding) | `data-worker` | *Planned* (Phase 7) |

---

## Admin Console

| Feature | App | Status |
| --- | --- | --- |
| Login / logout (MODERATOR + ADMIN only) | `apps/admin` | **Done** |
| Report moderation queue | `apps/admin` | **Done** |
| User management (role change, deactivate, reactivate) | `apps/admin` | **Done** |
| Alert management (create, cancel, status tabs) | `apps/admin` | **Done** |
| Dataset management (publish toggle, access policy) | `apps/admin` | **Done** |
| Organization management and memberships | `apps/admin` | **Done** — RBAC permission `organizations.manage`; users can belong to multiple organizations |
| Ingestion monitoring dashboard | `apps/admin` | **Done** — status tabs, per-job detail, provider name, error messages |
| Permission management (grant/revoke per role) | `permissions` | **Done** — `GET/POST/DELETE /admin/permissions/roles`; admin matrix view |
| Role-scoped analytics dashboards | `analytics` | **Done** — admin/moderator/government/researcher/orgadmin endpoints with tailored aggregations |
| Seed data for local development | `seed` | **Done** — 6 user accounts (one per role) + 1 organization seeded on boot |

---

## Public Web (`apps/web`)

| Route | Data Source | Status |
| --- | --- | --- |
| `/` | Weather, metrics, datasets, reports, alerts, biodiversity, restoration | **Done** — all sections live or honest empty state |
| `/data` | `GET /datasets`, `GET /providers` | **Done** |
| `/reports` | `GET /reports` | **Done** — public verified/resolved only; submission form; rows link to detail |
| `/reports/:id` | `GET /reports/:id`, `/comments`, `/media` | **Done** — description, status history, comments, media |
| `/alerts` | `GET /alerts` | **Done** — clickable cards and history rows |
| `/alerts/:id` | `GET /alerts/:id` | **Done** — description, instructions, subscription CTA |
| `/observations` | `GET /observations` | **Done** — submission form; rows link to detail |
| `/observations/:id` | `GET /observations/:id` | **Done** — trust level, description, details grid |
| `/biodiversity` | `GET /biodiversity/species`, `GET /biodiversity/occurrences` | **Done** — name search; rows link to detail |
| `/biodiversity/species/:id` | `GET /biodiversity/species/:id`, `/occurrences?speciesId` | **Done** — taxonomy, per-species occurrences |
| `/restoration` | `GET /restoration/projects` | **Done** — creation form, join action; title links to detail |
| `/restoration/:id` | `GET /restoration/projects/:id` | **Done** — description, details grid, join form |
| `/community` | `GET /community/posts` | **Done** — post list table with poll tag, create form, optional district filter |
| `/community/:id` | `GET /community/posts/:id` | **Done** — post body, poll with vote bars + vote form, flat comment list, add/delete comment |
| `/profile` | `GET /auth/profile`, `GET /reports/mine`, `GET /observations/mine`, `GET /notifications/subscriptions` | **Done** — live report + observation history; alert subscription management |
| `/industrial-sites` | `GET /facilities`, `GET /companies` | **Done** (2026-09-02) — tabbed: sites tab (filter by type, compliance, district) + companies tab (filter by type, district); `?tab=companies` switches views |
| `/industrial-sites/:id` | `GET /facilities/:id` | **Done** — compliance badge, facility details grid, linked citizen reports, OpenStreetMap link |
| `/industrial-sites/companies/:id` | `GET /companies/:id` | **Done** — company type badge, subsidiaries table, facilities table |
| `/login`, `/register` | `POST /auth/login`, `POST /auth/register` | **Done** |

# Backend API Links

Default local API base URL:

```text
http://localhost:3001/api/v1
```

Legend: ✓ Implemented | ~ Stub / planned | ✗ Not started

## Health

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/health` | Public | ✓ | API health check |

## Auth

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Public | ✓ | Create account (bcrypt, JWT); auto-queues verification email |
| POST | `/auth/login` | Public | ✓ | Login and issue token pair (`EMAIL` provider only) |
| POST | `/auth/refresh` | Public + refresh token | ✓ | Rotate token pair; old refresh token revoked |
| POST | `/auth/logout` | Public + refresh token | ✓ | Revoke refresh token; idempotent |
| GET  | `/auth/profile` | Authenticated | ✓ | Current user from DB |
| PATCH | `/auth/profile` | Authenticated | ✓ | Update display name, bio, phone, and profile fields |
| PATCH | `/auth/password` | Authenticated | ✓ | Change password (`EMAIL` provider only); revokes all sessions |
| POST | `/auth/forgot-password` | Public | ✓ | Enqueues password-reset email; always returns 200 (enumeration-proof) |
| POST | `/auth/reset-password` | Public | ✓ | Redeems reset token, sets new password, revokes all sessions |
| POST | `/auth/send-verification` | Authenticated | ✓ | (Re)sends email verification link; throttled 3/min |
| POST | `/auth/verify-email` | Public | ✓ | Marks email verified via token; throttled 10/min |
| GET  | `/auth/google` | Public | ✓ | Initiates Google OAuth 2.0 (Passport redirects to Google) |
| GET  | `/auth/google/callback` | Public | ✓ | Google consent callback; issues 30s exchange code → redirects to `APP_URL/auth/callback?code=…` |
| POST | `/auth/exchange` | Public | ✓ | Redeems 30s exchange code; returns access + refresh token pair (consumed server-side by Next.js) |

Refresh tokens are opaque, Postgres-backed, and rotated on use — not Redis, not JWTs. Register/login/logout each write an audit event with the caller's IP. Google OAuth users have `authProvider = GOOGLE` and cannot use the email/password login or password-management endpoints. See `docs/flows.md` "Google OAuth Sign-in Flow" for the exchange code pattern.

## Users

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/users` | Admin | ✓ | Paginated user list |
| GET | `/users/:id` | Admin | ✓ | User detail |
| GET | `/users/audit-events` | Admin | ✓ | Paginated audit event log (`?action`, `?userId`, `?entityType`) |
| PATCH | `/users/:id/role` | Admin | ✓ | Update user role (audited, records from/to) |
| GET | `/users/researcher-applications?status=&page=&pageSize=` | Admin | ✓ | Review queue; returns applicant, publication, and application details |
| PATCH | `/users/researcher-applications/:id/review` | Admin | ✓ | Request information, approve, or decline; approval grants `RESEARCHER` atomically |
| PATCH | `/users/:id/deactivate` | Admin | ✓ | Deactivate user (audited) |
| PATCH | `/users/:id/reactivate` | Admin | ✓ | Re-enable a deactivated user account |

Authenticated citizens submit and view their own application through `POST /researcher-applications` and `GET /researcher-applications/mine`. Submission requires a Google Scholar, ResearchGate, or ORCID link already saved on the user's profile. Admins review those profile links manually; applicants do not submit publication details. Applications do not grant researcher access while pending. Admin approval is the only path to the `RESEARCHER` role; direct role assignment is rejected.

## Organizations

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/organizations` | Public | ✓ | List organizations (`?type=OrganizationType`) |
| GET | `/organizations/:id` | Public | ✓ | Organization detail + providers |
| POST | `/organizations` | Authenticated | ✗ | Request org creation |
| PATCH | `/organizations/:id` | Org admin / Admin | ✗ | Update org |
| GET | `/admin/organizations` | `organizations.manage` | ✓ | Admin organization list with memberships |
| GET | `/admin/organizations/users` | `organizations.manage` | ✓ | Active users available for membership attachment |
| POST | `/admin/organizations` | `organizations.manage` | ✓ | Create organization |
| POST | `/admin/organizations/:id/members` | `organizations.manage` | ✓ | Attach or update a user membership |
| PATCH | `/admin/organizations/:id/members/:userId` | `organizations.manage` | ✓ | Change membership role (`ADMIN` / `MEMBER`) |
| DELETE | `/admin/organizations/:id/members/:userId` | `organizations.manage` | ✓ | Remove membership |

## Locations

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/locations/divisions` | Public | ✓ | All 8 divisions |
| GET | `/locations/districts` | Public | ✓ | All 64 districts (`?divisionId` filter) |
| GET | `/locations/districts/:id` | Public | ✓ | District detail |
| GET | `/locations/upazilas` | Public | ✓ | Upazilas (`?districtId` filter) |
| GET | `/locations/unions` | Public | ✓ | Unions (`?upazilaId` filter) |
| GET | `/locations/pollution-sources` | Public | ✗ | Known pollution sources |

## Providers

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/providers` | Public | ✓ | List active providers (`?type` filter) |
| GET | `/providers/:id` | Public | ✓ | Provider detail + datasets |

## Datasets

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/datasets` | Public | ✓ | Dataset catalog (`?category`, `?accessPolicy` filters) |
| GET | `/datasets/:id` | Public | ✓ | Dataset detail |
| GET | `/datasets/weather/current` | Public | ✓ | Live current weather for all districts, via `weather` module |
| GET | `/datasets/air-quality/current` | Public | ✓ | Live current air quality for all districts, via `weather` module |
| GET | `/datasets/:id/download` | Role-gated | ✓ | Policy-checked API access information |
| POST | `/datasets/:id/access-request` | Authenticated | ✓ | Request access |
| GET | `/datasets/:id/access-requests` | Admin | ✓ | List access requests |
| PATCH | `/datasets/:id/access-requests/:requestId` | Admin | ✓ | Approve or reject a request |
| POST | `/datasets` | Admin | ✓ | Create dataset record |
| PATCH | `/datasets/:id` | Admin | ✓ | Update metadata |
| GET | `/datasets/:id/versions` | Authenticated | ✓ | List published versions |
| POST | `/datasets/:id/versions` | Admin | ✓ | Publish a new version (audited) |

## Weather

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/weather/current` | Public | ✓ | Latest current-weather reading for every district |
| GET | `/weather/current/:districtId` | Public | ✓ | Latest current-weather reading for one district |
| GET | `/weather/hourly/:districtId` | Public | ✓ | Hourly forecast (`?from`, `?to`) |
| GET | `/weather/daily/:districtId` | Public | ✓ | Daily forecast (`?from`, `?to`) |
| GET | `/weather/air-quality` | Public | ✓ | Latest air quality reading for every district |
| GET | `/weather/air-quality/:districtId` | Public | ✓ | Latest air quality reading for one district |

Source: OpenMeteo, via a `@nestjs/schedule` cron scheduler (current every 15min, hourly + AQ every 2h, daily every 12h). See `docs/architecture/modules.md` "weather" for design notes and `docs/integrations/openmeteo.md` for provider details.

### Flood (OpenMeteo / GloFAS) and Water Level Stations

| Method | Path | Access | Status | Notes |
|---|---|---|---|---|
| GET | `/flood/forecast` | Public | ✓ | Latest stored discharge forecast row per station, ordered by station and newest forecast date |
| GET | `/flood/forecast/station/:stationId` | Public | ✓ | Full forecast window for one station (`?from`, `?to`) |
| GET | `/flood/forecast/district/:districtId` | Public | ✓ | Forecasts for all stations in a district |
| GET | `/flood/stations/:stationId/readings` | Public | ✓ | Historical water level readings (`?from`, `?to`) |
| GET | `/flood/stations/:stationId/latest` | Public | ✓ | Most recent water level reading |

Source: OpenMeteo Flood API, persisted as `StationFloodForecast` (station-based, replaced earlier district-based model). An empty table triggers an initial sync; normal refresh runs every six hours. See `docs/integrations/openmeteo-flood.md`.

### Water Bodies

| Method | Path | Access | Status | Notes |
|---|---|---|---|---|
| GET | `/water-bodies` | Public | ✓ | Water body registry with type/class filters |
| GET | `/water-bodies/stations` | Public | ✓ | All water level monitoring stations |
| GET | `/water-bodies/:id` | Public | ✓ | Water body detail including stations and upazila coverage |

## Companies and Industrial Facilities

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/companies` | Public | ✓ | List companies (`?type=CompanyType`, `?page`, `?pageSize`) |
| GET | `/companies/:id` | Public | ✓ | Company detail + subsidiaries |
| POST | `/companies` | Government / Admin | ✓ | Create company (audited `COMPANY_CREATE`) |
| PATCH | `/companies/:id` | Government / Admin | ✓ | Update company (audited `COMPANY_UPDATE`) |
| GET | `/facilities` | Public | ✓ | List industrial facilities (`?type=FacilityType`, `?complianceStatus`, `?districtId`) |
| GET | `/facilities/:id` | Public | ✓ | Facility detail + linked company |
| POST | `/facilities` | Government / Admin | ✓ | Create facility (audited `FACILITY_CREATE`) |
| PATCH | `/facilities/:id` | Government / Admin | ✓ | Update facility (audited `FACILITY_UPDATE`) |
| DELETE | `/facilities/:id` | Admin | ✓ | Delete facility (audited `FACILITY_DELETE`) |

**801 companies** (including conglomerate/subsidiary relationships) and **1,451 facilities** are seeded on boot by `CompaniesService.onModuleInit` (two-pass: parents before subsidiaries). `Company.name` is unique — facility seeds use pre-loaded company lookup maps.

## Emissions

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/emissions` | Public | ✓ | National GHG readings (`?indicator`, `?from`, `?to` year filters); ordered year DESC |
| GET | `/emissions/indicators` | Public | ✓ | Distinct indicator codes + display names |
| GET | `/emissions/:year` | Public | ✓ | All 4 indicators for a specific year; 404 if no data |

Source: World Bank Climate Change API (`EN.GHG.ALL`, `EN.GHG.CO2`, `EN.GHG.CH4`, `EN.GHG.N2O` — all in Mt CO₂e). Weekly scheduler (Sunday 3am); initial sync on empty table. See `docs/architecture/modules.md` "emissions" for design notes.

## Reports

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/reports` | Public (verified/resolved only) | ✓ | Paginated public reports |
| GET | `/reports/:id` | Public if publishable | ✓ | Report detail + status history |
| POST | `/reports` | Authenticated | ✓ | Submit report (audited) |
| PATCH | `/reports/:id/status` | Moderator / Admin | ✓ | Advance status (with audit) |
| GET | `/reports/moderation/queue` | Moderator / Admin | ✗ | Review queue (all statuses) |
| PATCH | `/reports/:id` | Owner / Moderator | ✗ | Edit report before review |

## Alerts

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/alerts` | Public | ✓ | Active alerts by default (`?status`, `?severity` filters) |
| GET | `/alerts/:id` | Public | ✓ | Alert detail |
| POST | `/alerts` | Government / Moderator / Admin | ✓ | Create and activate alert |
| PATCH | `/alerts/:id` | Government / Moderator / Admin | ✓ | Update status/instructions/expiry |

## Observations

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/observations` | Public | ✓ | Observations (`?category`, `?trustLevel`, `?districtId`); excludes `FLAGGED` by default |
| GET | `/observations/mine` | Authenticated | ✓ | Caller's own observations, all trust levels |
| GET | `/observations/nearby` | Public | ✓ | Spatial query by lat/lng + radius |
| GET | `/observations/:id` | Public | ✓ | Observation detail |
| POST | `/observations` | Authenticated | ✓ | Submit observation (audited; always starts `UNVERIFIED`) |
| PATCH | `/observations/:id` | Owner / Admin | ✓ | Edit observation |
| PATCH | `/observations/:id/trust` | Researcher / Admin | ✓ | Update trust level (audited, records from/to) |
| DELETE | `/observations/:id` | Owner / Admin | ✓ | Delete observation (audited) |
| POST | `/observations/:id/measurements` | Authenticated | ✓ | Attach a quantitative measurement (audited `OBSERVATION_MEASUREMENT_ADD`) |
| DELETE | `/observations/:id/measurements/:measurementId` | Owner / Admin | ✓ | Remove a measurement (audited `OBSERVATION_MEASUREMENT_DELETE`) |

Note the trust-level path is `/trust`, not `/verification`. Moderators are **not** granted trust-level changes — only `RESEARCHER` and `ADMIN`.

## Restoration

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/restoration/projects` | Public | ✓ | Projects (`?category`, `?status`, `?districtId`) |
| GET | `/restoration/projects/:id` | Public | ✓ | Project detail + participants |
| POST | `/restoration/projects` | Org admin / Admin | ✓ | Create project (audited) |
| PATCH | `/restoration/projects/:id` | Creator / Admin | ✓ | Update project (audited; ownership checked in the service, not by a route guard) |
| POST | `/restoration/projects/:id/join` | Authenticated | ✓ | Join project (audited; idempotent) |
| GET | `/restoration/projects/:id/targets` | Public | ✓ | List project targets |
| POST | `/restoration/projects/:id/targets` | Creator / Admin | ✓ | Add target (audited `RESTORATION_TARGET_ADD`) |
| GET | `/restoration/projects/:id/activities` | Public | ✓ | List activity log entries |
| POST | `/restoration/projects/:id/activities` | Authenticated | ✓ | Log an activity (audited `RESTORATION_ACTIVITY_ADD`) |
| GET | `/restoration/projects/:id/targets/:targetId/metrics` | Public | ✓ | List metric readings for a target |
| POST | `/restoration/projects/:id/targets/:targetId/metrics` | Authenticated | ✓ | Record a metric reading (audited `RESTORATION_METRIC_ADD`) |

Controller prefix is `restoration/projects`, not `restoration`.

## Media

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/media/upload` | Authenticated | ✓ | Multipart file upload — MIME validation, 100 MB limit |
| POST | `/media/presign` | Authenticated | ✓ | Returns presigned S3/MinIO URL for direct client upload |

## Biodiversity

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/biodiversity/species` | Public | ✓ | Species catalog (`?search`) |
| GET | `/biodiversity/species/:id` | Public | ✓ | Species detail |
| GET | `/biodiversity/occurrences` | Public | ✓ | Occurrences (`?speciesId`, `?districtId`) |
| GET | `/biodiversity/habitats` | Public | ✗ | Habitat catalog — no `Habitat` model yet |
| POST | `/biodiversity/species` | Researcher / Admin | ✗ | Create species record — species are GBIF-sourced only today |

Populated by a daily GBIF sync (`country=BD&hasCoordinate=true`). `iucnStatus` is stored but unpopulated — GBIF's occurrence search does not return it. See `docs/integrations/gbif.md` for provider details.

## Ingestion

Provider job-tracking API for scheduled external syncs. Weather, GBIF, and Flood schedulers create `IngestionJob` rows and update `Dataset.lastSyncedAt` on successful runs.

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/ingestion/jobs` | Moderator / Admin | ✓ | List ingestion jobs (`?status`, `?providerId`, `?page`, `?pageSize`) |
| POST | `/ingestion/jobs` | Admin | ✗ | Create ingestion job manually |
| GET | `/ingestion/jobs/:id` | Moderator / Admin | ✓ | Job detail |
| POST | `/ingestion/jobs/:id/retry` | Admin | ✗ | Retry failed job |
| POST | `/ingestion/providers/openmeteo/sync` | Admin | ✗ | Trigger OpenMeteo sync — superseded by the cron scheduler in `weather`, likely unnecessary now |

## Social Content

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/social-content/suggestions/national?cadence=DAILY|WEEKLY|MONTHLY` | `social_content.create` | ✓ | Generate live nationwide ranked suggestions with source windows, coverage, and quality metadata; review-only |
| GET | `/social-content/drafts` | `social_content.create` | ✓ | List reviewed social drafts |
| GET | `/social-content/drafts/:id` | `social_content.create` | ✓ | Draft, source snapshot, and rendered assets |
| POST | `/social-content/drafts` | `social_content.create` | ✓ | Create a source-backed draft |
| PATCH | `/social-content/drafts/:id` | `social_content.edit` | ✓ | Edit copy, format, and locale |
| POST | `/social-content/drafts/:id/render` | `social_content.render` | ✓ | Render deterministic SVG card |
| POST | `/social-content/drafts/:id/approve` | `social_content.approve` | ✓ | Approve a rendered card |
| POST | `/social-content/drafts/:id/archive` | `social_content.edit` | ✓ | Archive a draft |
| GET | `/social-content/drafts/:id/download` | `social_content.download` | ✓ | Return approved asset URL and dimensions |
| POST | `/social-content/drafts/:id/mark-published` | `social_content.approve` | ✓ | Record external manual publication |

Meta/Facebook/Instagram publishing and persisted/scheduled rule evaluation are not implemented. National suggestions are currently generated on demand from existing data.

## Metrics

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/metrics/platform` | Public | ✓ | Six live counts: active/emergency alerts, verified reports, public datasets, research-grade observations, districts covered |

## Permissions

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/admin/permissions` | Admin | ✓ | All permissions with their current role assignments |
| POST | `/admin/permissions/roles` | Admin | ✓ | Grant a permission to a role (idempotent) |
| DELETE | `/admin/permissions/roles` | Admin | ✓ | Revoke a permission from a role |

## Analytics

| Method | Path | Access | Status | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/analytics/admin` | Admin | ✓ | Admin dashboard data plus OpenMeteo/GBIF/World Bank freshness metadata: users by role, report queue, alert severity, org count, species count |
| GET | `/analytics/moderator` | Moderator | ✓ | Moderator dashboard data plus generated-at metadata: report queue breakdown, category counts, submission trend |
| GET | `/analytics/government` | Government | ✓ | Government dashboard data plus OpenMeteo freshness metadata: active alerts by canonical affected division, verified reports by district/category, 30d climate averages, and latest station-based flood/water-level signals |
| GET | `/analytics/researcher` | Researcher | ✓ | Researcher dashboard data plus GBIF freshness metadata: biodiversity totals, top species, observation trust breakdown |
| GET | `/analytics/orgadmin` | Organization Admin | ✓ | Organization-scoped restoration project counts, engagement metrics, and top projects by participants plus generated-at metadata; limited to organizations the caller administers |

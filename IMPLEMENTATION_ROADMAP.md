# Implementation Roadmap

## A. What Delta Signal can support today

Today the platform can support human-authored or manually selected, human-reviewed cards based on current weather, weather forecasts, river/discharge forecasts, active alerts, GBIF occurrences, verified reports, raw air-quality readings, national annual emissions, radiation, marine forecasts, and restoration metrics. It can resolve Bangladesh locations, label provider metadata, inspect ingestion health, store files in S3-compatible storage, and audit admin mutations.

It cannot yet safely support automated suggestions, generic historical comparisons, AQI health claims, static map export, automatic copy generation, or external social publishing without additional backend work.

## B. What requires additional backend work

- Social content module, DTOs, contracts, Prisma migration, permissions, and audit actions.
- Source adapters that return normalized structured card payloads and immutable source snapshots.
- Freshness/quality policy per content type and source completeness checks.
- Deterministic SVG/template renderer and S3 asset persistence.
- Admin routes/server actions/pages and preview/download behavior.
- Historical comparison and weekly/monthly aggregation services.
- Rule evaluation, deduplication, cooldowns, and scheduled candidate jobs.
- Only later: publication outbox, Meta adapters, encrypted token lifecycle, retry, and external status reconciliation.

## C. Recommended first five photocard types

1. **Weather Forecast** — complete district forecast model and clearly bounded claims.
2. **Current Weather / Daily Environmental Snapshot** — high-frequency, understandable, low editorial risk.
3. **River / Discharge Signal** — differentiated, useful, and already supported by station/forecast entities when wording stays precise.
4. **Environmental Alert** — leverages existing editorial severity, areas, expiry, and notification workflow.
5. **Biodiversity / Species Observation** — strong public-interest content with GBIF/observation provenance, provided image rights and trust labels are enforced.

Verified Citizen Report is the next candidate, but should follow the first five because privacy, consent, redaction, and verification workflows add editorial risk.

## D. Recommended MVP scope

MVP is Phase 1 only: a Social Content area for MODERATOR/ADMIN with manual Create Post, source selection for the first five types, structured English/Bengali fields, deterministic 4:5 and 1:1 templates, evidence/provenance panel, server-rendered preview/final PNG or SVG, draft/render/approve/download lifecycle, manual “mark as published”, S3-compatible asset storage, strict freshness/disclaimer checks, and audit events. Include no automatic rule suggestions in the first deploy; the data adapters should be designed so Phase 2 can reuse them.

## E. Explicitly out of MVP

- Facebook/Instagram Graph API, OAuth, token storage, auto-publishing, scheduling, or retries.
- LLM-generated copy or translation unless a separately approved constrained service is added; deterministic copy is enough initially.
- Arbitrary admin-authored HTML/SVG layouts or AI-designed layouts.
- Map-of-the-day image export.
- Generic historical anomaly claims, weekly/monthly summaries, AQI/health advice, or facility pollution/illegality claims.
- Automatic promotion of citizen reports/observations without verification, consent, and quality labels.
- New Redux/Zustand state layer, separate design system, or heavy browser automation renderer.

## Phase plan

### Phase 1 — Manual card creation from Admin Console

**Backend:** Add `SocialPostDraft`, `CardTemplate`, `RenderedAsset`, and optional `SocialPublicationRecord` tables; social module/controller/service/DTOs; first five source adapters; freshness and safety validator; deterministic renderer; storage integration; audit events; permission keys; contracts.

**Frontend/admin:** Add nav/page shell, draft list, create/edit form, evidence panel, client preview, format selector, render/approve/download/mark-published actions, tabs and filters using existing CSS patterns.

**Database:** Named additive migration only; indexes on status/type/createdAt, source fingerprints, draft/template relation, asset relation; no destructive changes. Regenerate Prisma client and update shared/contracts enums/types.

**Testing:** DTO rejection/authorization; source adapter fixtures; freshness and disclaimer policy tests; render snapshot/golden tests for 4:5/1:1; lifecycle transition tests; asset upload/download tests; e2e admin workflow; Bengali/English overflow tests.

**Observability:** structured render/audit logs, render duration/failure metrics, source freshness warnings, asset hash/version, ingestion-job references.

**Security:** permission checks, strict payload validation, no arbitrary markup, signed downloads, image MIME/size limits, privacy checks for reports, audit actor/IP, no secrets in payloads.

**Complexity:** Medium-high. Dependencies: renderer spike, storage configuration, product-approved branding/templates, permission names, migration review. Migration concern: additive tables and enum changes must preserve existing Prisma enum conventions.

### Phase 2 — Data-driven Suggested Posts

**Backend:** Add `SocialContentSuggestion`, source signal normalizers, suggestion APIs, fingerprint/cooldown, dismiss/convert lifecycle, freshness scoring, and first candidate producers for active alerts, forecast refreshes, notable GBIF records, and selected river signals.

**Frontend/admin:** Suggested Posts queue, reason/source/quality display, Create Post conversion, dismiss reason, filters, counts, empty/error states.

**Database:** Suggestion table and indexes; source fingerprint uniqueness; optional rule key nullable for manual suggestions.

**Testing:** duplicate suppression, stale-source suppression, conversion idempotency, permissions, pagination, provider failure behavior.

**Observability:** candidate counts by type, dismissal/convert rates, stale/skipped counts, producer duration and errors.

**Security:** suggestions do not auto-approve; source visibility and personal data filters; no unverified citizen content by default.

**Complexity:** Medium. Dependencies: Phase 1 source adapters and snapshot schema. Migration concern: make suggestion creation resumable and safe to rerun.

### Phase 3 — Rule-based automatic content generation

**Backend:** Add `ContentGenerationRule`, rule evaluator service, validated threshold/window configs, scheduled evaluation with PostgreSQL cron locks, candidate fingerprinting, and safe deterministic copy generation. Start with rainfall threshold, forecast rain probability, temperature threshold, river discharge percentile/ratio, active alert, and GBIF freshness rules.

**Frontend/admin:** Rules/Settings page with enable/disable, threshold, scope, cooldown, test-evaluate/preview, and last-run/error state. Keep rule changes ADMIN-only or separately permissioned.

**Database:** Rules and run history/outcome records if operational debugging needs durable history.

**Testing:** boundary values, timezone/window behavior, missing data, provider outage, per-rule cooldown, concurrent job lock, no publication side effects.

**Observability:** rule run metrics, candidate reason/fingerprint, skipped quality reason, error rate, evaluation latency.

**Security:** configuration validation, bounded thresholds, audit rule changes, approval remains mandatory.

**Complexity:** High. Dependencies: stable normalized source payloads and historical/quality policy. Migration concern: rule configs need schema versions for future changes.

### Phase 4 — Scheduled publishing

**Backend:** Add approved-draft publication scheduling/outbox abstraction, timezone-aware scheduled jobs, immutable asset selection, cancellation, status transitions, and operator retry controls. This phase can still target a manual export queue or a future adapter; do not assume Meta access.

**Frontend/admin:** Schedule field, calendar/list view, publish queue, cancel/retry, audit detail.

**Database:** Publication schedule/status/attempt tables and idempotency keys.

**Testing:** timezone/DST, approval invalidation, duplicate workers, cancellation races, retry limits.

**Observability:** queue depth, due/late jobs, attempts, failures by provider, audit trail.

**Security:** only approved assets, role-based scheduling, no token exposure, immutable content hash.

**Complexity:** Medium-high. Dependencies: publication adapter contract and operational scheduler. Migration concern: preserve manual publication records while adding scheduled states.

### Phase 5 — Optional safe auto-publishing

**Backend:** Facebook Page and Instagram Business adapters behind feature flags; encrypted token/connection records, consent/scopes, token expiry/re-auth, idempotent outbox, bounded retries, provider error classification, external status reconciliation, and approval policy engine.

**Frontend/admin:** Connection setup/status, token expiry warnings, per-type approval policy, platform selection, publish result/error history, emergency disable.

**Database:** Provider connection/credential references, publication attempts, external IDs, error logs, policy versions. Secrets should use a managed secret store or encrypted column with key management.

**Testing:** provider sandbox/mocks, token expiry, rate limits, duplicate request recovery, container polling for Instagram, partial failure, policy bypass prevention.

**Observability:** per-platform success/failure/latency, retry, rate-limit, token health, external ID, and policy decision metrics.

**Security:** least privilege, encrypted secrets, rotation/revocation, no access token logs, approval gates for alerts/reports/forecast claims, emergency kill switch.

**Complexity:** Very high and externally dependent. Migration concern: platform API/version changes, account ownership, compliance/privacy, and recovery from partially created posts.

## F. Proposed implementation order

1. Approve the first five types, disclaimer language, dimensions, and template branding.
2. Build source-normalizer interfaces and freshness/quality policies without persistence changes.
3. Implement Phase 1 tables, permissions, audit actions, renderer, storage, API, and Admin flow.
4. Verify golden renders, Bengali typography, source traceability, and manual download in staging.
5. Add Phase 2 suggestions for the safest signals; measure editorial acceptance before rules.
6. Add rule evaluation only after suggestion quality and duplicate suppression are proven.
7. Add scheduling and publication adapters as separate operational milestones.

## G. Main technical risks

- Renderer/font availability and consistent Bengali text wrapping in deployment.
- S3 object lifecycle, signed URL expiry, and orphaned assets after draft edits.
- Prisma enum/migration drift across shared types and contracts.
- Source payloads changing or being corrected after a draft is created.
- Current Admin Console lacks a chart/map renderer and may need a small client preview boundary.
- Scheduler concurrency, duplicate suggestions, and provider outages.
- Future Meta API policy/version/account constraints.

## H. Main data-quality and scientific-accuracy risks

- Model/grid values may be mistaken for local sensor observations.
- Forecasts may be shared as facts unless the forecast label and issue time are prominent.
- Discharge, water level, danger thresholds, and flooding are different claims.
- Stored percentile/mean fields are not automatically a historical climatology.
- 30-day rollups need visible window and update time; missing unions can bias them.
- Raw pollutants are not an AQI or health-risk category without an approved method.
- GBIF occurrence/one observation is not abundance, population trend, or conservation status.
- Citizen reports and images are not verified measurements; report status and consent matter.
- Facility compliance/status is not proof of pollution or illegality.
- Annual national emissions cannot support district or real-time claims.
- Causal explanations and extreme-language headlines must be prohibited unless supported by explicit source evidence and reviewed copy.


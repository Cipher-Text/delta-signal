# Social Content Architecture

## Design principles

The feature is an editorial projection of existing environmental data, not a new data authority. It must preserve source traceability, use deterministic templates, keep AI (if introduced later) limited to copy suggestions, and make approval explicit. No Meta integration belongs in the first implementation.

## Editorial series are separate from technical source types

The current `SocialContentType` values are useful backend source categories, but they should not become the public information architecture. A social-media manager chooses **Rain Watch**, **River Watch**, **Today in Bangladesh**, **Alert Explainer**, **Verified Community Report**, or **Wild Bangladesh**. The service then resolves that series to one or more allowed source types and a versioned template.

This separation matters because the same weather source can support a practical forecast card or a calm daily snapshot, while a river forecast must not be presented as a flood declaration. It also gives design and editorial teams stable series names while backend providers evolve.

Recommended MVP mapping:

| Editorial series | Allowed source type(s) | Review policy |
|---|---|---|
| Rain Watch | `CURRENT_WEATHER`, `WEATHER_FORECAST` | Human approval; future scheduled drafts possible |
| River Watch | `RIVER_SIGNAL` plus observed station reading | Human approval by default |
| Today in Bangladesh | `CURRENT_WEATHER` plus district 30-day rollup | Human approval; freshness gate |
| Alert Explainer | `ENVIRONMENTAL_ALERT` | Human approval; copy cannot exceed alert severity |
| Verified Community Report | citizen report/media source (new source resolver) | Human approval, consent/redaction required |
| Wild Bangladesh | `BIODIVERSITY_OBSERVATION` | Human approval, rights/quality gate |

Do not add a new database type for every poster idea. Store the editorial `seriesKey` in the structured payload/template configuration first; introduce a normalized enum only when filtering, rules, or permissions need database-level querying.

## Minimum domain model

Use names consistent with existing Prisma nouns and avoid placing card fields on `Dataset`, `Alert`, or `Media`.

### `SocialContentSuggestion`

Represents a candidate produced by a future rule or manually seeded from a signal. Fields: `id`, `type`, `status` (`OPEN`, `DISMISSED`, `CONVERTED`, `EXPIRED`), `reason`, `quality`, `sourceRefs` JSON, optional location IDs, `generatedAt`, `expiresAt`, `dismissedBy/At/reason`, and `draftId`. `sourceRefs` should contain typed references to exact source table/record IDs and ingestion job IDs; it is provenance, not arbitrary user input.

### `SocialPostDraft`

Represents editable structured editorial content. Fields: `id`, `type`, `status` (`DRAFT`, `READY_TO_RENDER`, `RENDERED`, `APPROVED`, `ARCHIVED`), `locale`, `headline`, `summary`, `caption`, `bnHeadline`, `bnSummary`, `bnCaption`, `structuredPayload` JSON, `sourceSnapshot` JSON, location references, `templateId`, `createdById`, `updatedById`, `approvedById/At`, `contentVersion`, and timestamps. `sourceSnapshot` freezes the facts used for the draft so later source updates cannot silently change an approved card.

### `CardTemplate`

Versioned metadata, not arbitrary layout code in the database: `id`, `key`, `name`, `version`, `supportedTypes`, `supportedFormats`, `schemaVersion`, `isActive`, `config` JSON (safe design tokens/slot options), and audit timestamps. Template rendering code remains deployed application code.

### `RenderedAsset`

One render output per draft/version/format. Fields: `id`, `draftId`, `templateId`, `format`, `width`, `height`, `storageKey`, `publicUrl` or signed-download reference, `contentHash`, `renderVersion`, `status`, `createdById`/render job actor, and timestamps. Use `StorageService` with a dedicated `social-cards` folder; do not overload `ReportMedia`.

### `SocialPublicationRecord` (future-compatible, manual in MVP)

Fields: `id`, `draftId`, `platform` (`MANUAL`, later `FACEBOOK`, `INSTAGRAM`), `status` (`NOT_PUBLISHED`, `MARKED_PUBLISHED`, later `QUEUED`, `PUBLISHING`, `PUBLISHED`, `FAILED`), external post URL/ID, publishedAt, note, error, and actor. MVP only supports manual marking; no access token fields should be added yet.

### `ContentGenerationRule` (Phase 3)

Fields: `id`, `key`, `type`, `config` JSON with validated thresholds/windows, `enabled`, cadence, cooldown, lastRunAt, and owner/audit metadata. Rule evaluations create suggestions, never drafts that bypass review and never publications.

## Relationships and traceability

`SocialContentSuggestion 1—0..1 SocialPostDraft 1—many RenderedAsset`; `SocialPostDraft many—1 CardTemplate`; `SocialPostDraft 1—many SocialPublicationRecord`. Location foreign keys may point to `District`, `Upazila`, `Union`, `WaterLevelStation`, or `WaterBody` depending on type, but flexible `sourceRefs` are needed because source tables differ.

Every draft must preserve:

- provider name and dataset/source label;
- source table and primary key for each fact;
- `IngestionJob` ID where available;
- source retrieved/observed/forecast timestamp;
- units, quality/trust, and comparison window;
- the exact structured payload used to render;
- template key/version and render version.

Prefer a normalized `SocialSourceReference` child table for queryable provenance after MVP; JSON is acceptable for the first migration if validated with DTOs and an immutable snapshot.

## Lifecycle and idempotency

Draft lifecycle: `DRAFT → READY_TO_RENDER → RENDERED → APPROVED → ARCHIVED`. A rendered asset is immutable; edits increment `contentVersion` and invalidate approval until re-rendered. A suggestion is idempotent on `(ruleKey, sourceFingerprint, location, window)` with a unique constraint or deterministic hash. Re-running a rule updates freshness/metadata rather than creating duplicates inside its cooldown.

Approval must verify that the source snapshot still satisfies freshness and safety policies. Download should return a short-lived signed URL or streamed asset, and every render/approval/download/manual-publication action should write an `AuditEvent` with entity ID, version, source IDs, and content hash.

Rule evaluation should also persist the reason a suggestion was accepted or rejected: freshness result, evidence label, quality flag, threshold/window, and source fingerprint. This makes “why did Delta Signal suggest this?” answerable to editors and prevents a threshold from being mistaken for an editorial judgment.

## API proposal

All routes use `/api/v1/social-content` and are represented in `packages/contracts` before frontend calls are added:

- `GET /suggestions?status=&type=&districtId=&page=`
- `POST /suggestions/:id/dismiss`
- `POST /drafts` (manual create or convert suggestion)
- `GET /drafts`, `GET /drafts/:id`
- `PATCH /drafts/:id`
- `POST /drafts/:id/copy-suggestion` (deterministic initially; future constrained AI)
- `POST /drafts/:id/render`
- `GET /drafts/:id/assets`
- `POST /drafts/:id/approve`
- `POST /drafts/:id/archive`
- `POST /drafts/:id/mark-published`
- `GET /templates`, admin `POST/PATCH /templates/:id`
- Phase 3: admin `GET/PATCH /rules`, internal/scheduled rule evaluation service.

The controller should use `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` through existing decorators and strict DTO validation (`whitelist`, `forbidNonWhitelisted`, `transform`).

## Rendering choice

Use deterministic SVG generation on the backend, then rasterize to PNG using the lightest deployment-compatible mechanism already approved for the repository. The card is naturally vector: text, shapes, icons, metric bars, source footer, and optional licensed photo. SVG makes 4:5/1:1/9:16 layouts explicit and testable, avoids browser font/layout drift, and supports a shared preview representation. If the deployment image cannot rasterize SVG without a new dependency, retain SVG as the canonical asset and add a narrowly scoped PNG renderer only after a deployment spike.

Do not use frontend HTML/CSS screenshots as the canonical output: they are difficult to reproduce server-side and can differ by browser. Do not allow arbitrary SVG/HTML from admins. Template code should expose typed slots and design tokens only. The Admin preview should call the same render endpoint or shared render contract used for the final asset.

## Storage and operations

Use existing S3-compatible `StorageService`, add a dedicated folder and MIME policy for generated PNG/SVG, and store only object keys plus metadata in `RenderedAsset`. Keep the source image URL/credit in the payload if a biodiversity/report image is used. Do not copy unlicensed GBIF or citizen media into a card without rights/consent checks.

Rendering can start synchronously for one card, with a BullMQ render queue later if generation is slow. Record render duration, failures, template/render versions, asset size, and source freshness. Never allow a render failure to mutate approval state.

## Future Meta architecture (recommendation only)

Later add a provider-agnostic `PublicationService` and adapters for Facebook Page and Instagram Business publishing. Store encrypted, least-privilege page/account tokens outside normal draft rows; track token expiry, scopes, owner/account IDs, and refresh/re-consent state. Flow: approved draft → publication outbox with idempotency key `(draftId, platform, publishAttemptVersion)` → adapter → retry with bounded exponential backoff → status/log/error. Handle Instagram media-container creation/polling separately from Facebook Page photo/feed publishing. Support scheduled publication only from approved immutable assets, with a policy requiring human approval for alerts, citizen reports, and any low-quality/forecast content. Audit all token changes and external IDs; never retry non-idempotent requests without the idempotency record.

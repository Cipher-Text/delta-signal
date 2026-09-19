# Social Content Admin UX

## IA recommendation

Add a top-level **Social Content** section between Moderation and Administration in `AdminNav`, visible to MODERATOR and ADMIN once the permission is granted. Use these pages:

- **Suggested Posts** — candidate queue with reason, source, quality, preview, Create Post, Dismiss.
- **Create Post** — structured source/type selector and draft editor.
- **Drafts** — editable, unrendered or rendered but not approved work.
- **Generated Cards** — rendered assets awaiting approval or ready for download.
- **Published / Archived** — manual external publication marks and historical cards.
- **Templates** — admin-managed versioned template metadata; no arbitrary HTML editing in MVP.
- **Rules / Settings** — disabled/read-only in Phase 1, then thresholds and enablement in later phases.

For Phase 1, Suggested Posts, Templates, Rules, and publication integrations can be visibly marked “Coming in later phase” or omitted from navigation. Keep the first usable path short: Create Post → Preview → Render → Approve → Download.

## Suggested Posts

Use the existing URL-driven tab/filter and `data-table` patterns. Each row/card contains:

- content type and status badge;
- headline and one-line reason (“new active alert”, “district forecast refreshed”, “research-grade GBIF occurrence”);
- related district/station/species;
- key metrics with units and source;
- generated time and source freshness indicator;
- quality label: `HIGH`, `REVIEW`, or `STALE/UNAVAILABLE` with explanation;
- small deterministic preview;
- `Create Post` and `Dismiss` actions.

Dismissal should require an optional reason for analytics, be reversible for ADMIN, and never delete source data. A suggestion must link to its exact source record IDs.

## Create Post workflow

1. **Choose type** from supported types; show a short purpose and data requirements.
2. **Choose source/date/location** using existing location endpoints and type-specific selectors. Disable incompatible combinations, e.g. marine for inland districts.
3. **Load structured data** server-side and display source record, as-of time, units, freshness, and quality warnings.
4. **Generate suggested copy** from deterministic fields. A future constrained copy helper may produce alternatives, but the UI must mark generated copy and preserve the source facts.
5. **Edit** headline, summary, caption, Bengali/English fields, source note, disclaimer, and metric visibility. Source values are read-only in the copy editor; admins must change the source selection rather than typing a different measurement.
6. **Select template and format** (`4:5`, `1:1`; story disabled until supported). Preview uses the same template inputs as rendering.
7. **Preview photocard** beside an evidence panel showing sources and warnings. The preview must visibly label forecasts, citizen reports, and model-derived values.
8. **Render final image** on the server and save an immutable render version. Report validation/layout errors clearly.
9. **Approve** only after required disclaimer/source checks pass. Approval captures actor/time and a content hash.
10. **Download/export** the approved PNG. The browser should not be the system of record for rendering.
11. **Mark externally published** optionally with platform, external URL/post ID if known, publication time, and note. This is a manual record only; it does not call Meta.

## Reuse of existing Admin patterns

Reuse `AdminLayout`, `AdminNav`, `apiGet`, server actions, `ADMIN_ACCESS_TOKEN_COOKIE`, `page-header`, `tab-bar`, `flash`, `data-table`, `tag`, `badge`, `btn`, pagination, and existing form controls in `apps/admin/app/globals.css`. Keep pages server components by default; isolate only the live preview/editor controls into a small client component.

Do not add a client state library. Keep draft ID/status/filters in the URL where possible; save draft state through server actions and API calls. The editor can use local client state for unsaved form fields, but must warn before navigation.

## Evidence panel and safety UX

The preview screen must show a non-editable “Evidence” panel:

- source provider and dataset;
- source record IDs and ingestion job ID(s);
- selected location and coordinates/station;
- observed/forecast/reported/model-derived label;
- timestamp and freshness status;
- comparison window and baseline if used;
- quality/trust level;
- required disclaimer and attribution.

Block approval for missing source, stale data beyond the type policy, missing unit, missing required forecast/report label, or unreviewed citizen content. Warnings may be overrideable only by a permissioned reviewer with an audit reason.

## Roles and permissions

Introduce `social_content.create`, `social_content.edit`, `social_content.render`, `social_content.approve`, `social_content.download`, `social_content.manage_templates`, and `social_content.manage_rules` only if the existing permissions matrix needs this granularity. MVP can use `social_content.manage` for MODERATOR/ADMIN, but approval should be separable before future publishing. ADMIN remains the emergency bypass as in `PermissionsGuard`.

Suggested default: MODERATOR can create/edit/render/download; ADMIN can approve, manage templates/rules, archive, and mark publication. This aligns with existing moderation responsibilities while protecting public-facing claims.


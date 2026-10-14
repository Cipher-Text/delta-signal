# Dashboard Guide

Delta Signal has two dashboard-like surfaces with different audiences and access rules. They share the same environmental data but serve different jobs.

## Public Environmental Board (`/`)

The root page is anonymous-accessible and is the public overview of Bangladesh's environmental conditions. It combines:

- live weather and air-quality summaries
- flood-risk and emergency alert strips when data is available
- national climate and platform metric bands
- public reports, alerts, biodiversity, and restoration previews
- dataset summaries and contribution calls to action

The public board is designed for scanning and discovery. It does not require an account and should not expose private records, moderation queues, or role-specific operational data.

## Role-Scoped Analytics Workspace (`/dashboard`)

`/dashboard` is an authenticated app-shell route. It loads one analytics response based on the exact platform role in the current session:

| Role | View | Primary focus |
| --- | --- | --- |
| `CITIZEN` | My Environmental Activity | Personal reports, observations, restoration participation, and community contributions |
| `ADMIN` | Platform Overview | Users, reports, alerts, organizations, datasets, species, observations, audit activity |
| `MODERATOR` | Moderation Queue | Review backlog, submission trend, report categories, status breakdown |
| `GOVERNMENT` | Environmental Intelligence | Nationwide alerts, canonical affected divisions, verified reports, climate averages, and station-based flood/water-level signals |
| `RESEARCHER` | Biodiversity Intelligence | Species and occurrence totals, observation quality, monthly trends |
| `ORGANIZATION_ADMIN` | Restoration Portfolio | Organization-scoped project status, categories, participation, and most-engaged projects |

The web route calls the matching API endpoint and renders the response with shared dashboard primitives: headers, KPI cards, bar charts, trend charts, section headers, and data tables. The client does not invent fallback analytics values.

## Presentation conventions

The dashboard uses the app-shell design system with a data-first layout:

- a compact page header identifies the workspace and shows Bangladesh/live context
- KPI cards summarize the most actionable counts and link to related collections where appropriate
- supporting panels group related breakdowns and trends
- deep green is used for primary actions and positive status; teal is used for data; amber and red are reserved for warnings and emergencies
- responsive grids collapse to a single column on smaller screens, with KPI cards retaining a two-column mobile layout
- the visual refresh does not change metric meanings, access rules, audit behavior, or ingestion schedules; the shared response contract additionally carries freshness metadata

Each analytics response also includes dashboard metadata. The header shows the latest successful relevant provider sync and source names. Admin sees OpenMeteo, GBIF, and World Bank status; Government sees OpenMeteo; Researcher sees GBIF; Moderator and Organization Admin views contain internal platform records and therefore have no external provider freshness source. Current freshness windows are 48 hours for OpenMeteo, 72 hours for GBIF, and 14 days for World Bank data. If no successful ingestion job is available, the source is shown as `UNKNOWN` rather than receiving an invented timestamp; stale data is shown with an amber status.

The public board does not display a hardcoded provider health claim. Public source labels are limited to the source and data type shown by each live component; verified freshness is available in role-scoped dashboard metadata.

Public weather and map copy uses “latest available” or “current available snapshot” unless the component has a concrete timestamp; this prevents cached API responses from being presented as real-time observations.

The public weather strip now displays the latest `readingTime` returned by the weather API, and the national climate band displays the latest available `climateUpdatedAt` when present. Missing timestamps remain explicitly unavailable.

## API and access

The API prefix is `/api/v1`. Dashboard data is role-gated at the API layer and the web route also prevents unsupported roles from entering a role-specific view.

Organization-admin analytics are filtered to organizations where the authenticated user has an `ADMIN` membership. A user with no administered organization receives an explicit empty portfolio; platform-wide restoration data is never returned by this view.

Government alert-by-division counts are derived from canonical `AlertArea` records. District, upazila, and union areas resolve to their parent division; each alert is counted at most once per division. Alerts with no resolvable area are grouped as `Nationwide`.

Government flood indicators use the latest stored `StationFloodForecast` and `WaterLevelReading` row for each `WaterLevelStation`. Discharge is classified as `HIGH` at 2× historical mean (or above 1.5× P75) and `ELEVATED` at 1.5× mean (or above P75). Gauge readings are classified against the station's existing warning/danger thresholds; missing thresholds remain `UNKNOWN`. The dashboard does not invent coverage or warnings when the underlying station records are absent.

| Endpoint | Required role |
| --- | --- |
| `GET /analytics/citizen` | `CITIZEN` |
| `GET /analytics/admin` | `ADMIN` |
| `GET /analytics/moderator` | `MODERATOR` |
| `GET /analytics/government` | `GOVERNMENT` |
| `GET /analytics/researcher` | `RESEARCHER` |
| `GET /analytics/orgadmin` | `ORGANIZATION_ADMIN` |

Public aggregate counters on the homepage are a separate concern and are served by `GET /metrics/platform`.

The homepage flood strip uses the latest station-based forecast rows from `GET /flood/forecast`, keeps station/river/district context, and shows up to eight elevated or high discharge signals. The strip labels OpenMeteo/GloFAS discharge as simulated and explicitly states that it is not an official flood warning or flood-impact assessment. If forecasts are present but no station crosses the elevated threshold, it shows a neutral no-signal state; if the feed is unavailable, it reports that condition rather than implying safety.

The public map's `Flood / river` layer uses the same discharge thresholds for marker colors and exposes the station, river, district, forecast date, ratio to historical mean, and a link to the station detail page.

Station detail pages show the latest observed water-level threshold status and trend alongside the earliest available discharge forecast signal and ratio to historical mean. Forecast copy identifies the OpenMeteo/GloFAS value as simulated rather than an official warning.

District profiles select the earliest available forecast date across the district's stations and rank same-day stations by discharge relative to historical mean, rather than treating the first API row as the current district signal.

The HIGH/ELEVATED classification is defined once in `packages/shared` and reused by the API analytics response, homepage strip, and public map. API regression tests cover the threshold boundaries, missing comparison values, and newest-per-station query ordering.

## Verification

Build the repository from its root to verify the dashboard route and shared styles:

```bash
pnpm build
```

The dashboard route is dynamic because it depends on the authenticated user and live API data. A local browser check requires the web app, API, PostgreSQL, and a seeded role-appropriate account to be running.

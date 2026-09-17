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
| `ADMIN` | Platform Overview | Users, reports, alerts, organizations, datasets, species, observations, audit activity |
| `MODERATOR` | Moderation Queue | Review backlog, submission trend, report categories, status breakdown |
| `GOVERNMENT` | Environmental Intelligence | Nationwide alerts, affected divisions/districts, verified reports, climate averages |
| `RESEARCHER` | Biodiversity Intelligence | Species and occurrence totals, observation quality, monthly trends |
| `ORGANIZATION_ADMIN` | Restoration Portfolio | Project status, categories, participation, and most-engaged projects |
| `CITIZEN` | Empty state | Citizens use the public board and contribution routes; no analytics workspace is provided |

The web route calls the matching API endpoint and renders the response with shared dashboard primitives: headers, KPI cards, bar charts, trend charts, section headers, and data tables. The client does not invent fallback analytics values.

## Presentation conventions

The dashboard uses the app-shell design system with a data-first layout:

- a compact page header identifies the workspace and shows Bangladesh/live context
- KPI cards summarize the most actionable counts and link to related collections where appropriate
- supporting panels group related breakdowns and trends
- deep green is used for primary actions and positive status; teal is used for data; amber and red are reserved for warnings and emergencies
- responsive grids collapse to a single column on smaller screens, with KPI cards retaining a two-column mobile layout
- the dashboard refresh is visual only; it does not change API contracts, metrics, access rules, audit behavior, or ingestion schedules

## API and access

The API prefix is `/api/v1`. Dashboard data is role-gated at the API layer and the web route also prevents unsupported roles from entering a role-specific view.

| Endpoint | Required role |
| --- | --- |
| `GET /analytics/admin` | `ADMIN` |
| `GET /analytics/moderator` | `MODERATOR` |
| `GET /analytics/government` | `GOVERNMENT` |
| `GET /analytics/researcher` | `RESEARCHER` |
| `GET /analytics/orgadmin` | `ORGANIZATION_ADMIN` |

Public aggregate counters on the homepage are a separate concern and are served by `GET /metrics/platform`.

## Verification

Build the repository from its root to verify the dashboard route and shared styles:

```bash
pnpm build
```

The dashboard route is dynamic because it depends on the authenticated user and live API data. A local browser check requires the web app, API, PostgreSQL, and a seeded role-appropriate account to be running.

# Frontend Design Mocks

Revised static design mocks for Delta Signal. Open `index.html` in a browser to start.

All pages are linked — navigate between them using the sidebar (app pages) or the top nav (public page).

## Pages

| File | Layout | Purpose |
| --- | --- | --- |
| `index.html` | Public nav | Public single-page environmental board — no login required |
| `data.html` | App sidebar | Dataset catalog, provider health, chart, gated downloads |
| `observations.html` | App sidebar | Observation explorer with trust level pills and map |
| `reports.html` | App sidebar | Citizen report list, submission form preview, status flow |
| `alerts.html` | App sidebar | Active alerts with severity cards, warning zone map, history |
| `biodiversity.html` | App sidebar | Species cards, occurrence records, habitat pressure chart |
| `restoration.html` | App sidebar | Project map, organization leaderboard, active project list |
| `community.html` | App sidebar | Campaigns, eco challenges, moderated activity feed |
| `profile.html` | App sidebar | Citizen profile hero, tab nav, activity feed, settings |
| `admin.html` | Admin sidebar | Operations console, moderation queue, ingestion health, audit log |
| `theme.html` | App sidebar | Full design system — colors, typography, all component states |

## Design direction — Civic Nature

- Neutral app surfaces for serious data workflows.
- Deep green (`#2f7d5c`) for primary actions and active navigation.
- Teal/blue (`#0f766e`) for maps, water data, and environmental readings.
- Amber/red reserved strictly for warnings and emergencies — never decorative.
- Compact dashboard layout, not a marketing landing page.

## Navigation

- **Public page** (`index.html`): top nav links to all feature pages.
- **App pages**: shared sidebar with grouped nav labels — Overview, Explore, Account, System.
- **Admin** (`admin.html`): separate sidebar with operational groupings — Operations, Data, Community, Platform.
- Every page CTA links to a real destination.

## Component inventory (styles.css)

Base: `.metric`, `.panel`, `.table`, `.map-canvas`, `.segmented`, `.tag`, `.button`, `.chip`, `.alert-card`

Extended in this revision:
- `.tag.info` / `.tag.muted` — teal and neutral tag variants
- `.nav-label` — sidebar section group labels
- `.tab-nav` — horizontal tab bar (used in profile)
- `.select-field` — styled select element
- `.filter-bar` — filter control row
- `.trust-pill` — research-grade / community / unverified / flagged
- `.feed-item` / `.feed-avatar` / `.feed-body` — community and profile activity feed
- `.stat-row` — inline stat display in profile hero
- `.project-row` — restoration project list item
- `.occurrence-row` — biodiversity records table row
- `.admin-stat` / `.admin-stat-grid` — operational metric tiles
- `.info-banner` — access hint banner
- `.alert-strip` — inline emergency / warning banner
- `.public-footer` — sign-in CTA block on public page
- `.swatch` / `.type-sample` / `.component-row` — design system showcase

## Status

Mocks are complete and ready to use as implementation reference for Phase 1 (public web page) and Phase 2 (backend foundation).

The public board and app-shell designs have been implemented in `apps/web`. The role-scoped analytics workspace is documented in `docs/dashboard.md`; use these mocks as visual reference when extending the design system or completing the remaining accessibility pass.

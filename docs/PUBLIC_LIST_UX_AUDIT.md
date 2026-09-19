# Public List UX Audit

Audit date: 2026-09-02  
Scope: `apps/web` public-facing collection routes and collection-like sections. Admin routes, dashboard-only lists, private profile/settings lists, auth screens, and detail-only content are excluded unless a detail page contains a material public collection that affects list UX.

Follow-up note: division, district, upazila, and union pages received a shared continuous non-tabbed UX revision on 2026-09-19. Location-specific findings below should be revalidated before this audit is treated as current.

Evidence reviewed: `apps/web/app`, `apps/web/components`, `apps/web/lib/api.ts`, `apps/web/app/globals.css`, `apps/web/components/app-sidebar.tsx`, `docs/access-model.md`, `docs/architecture/feature-map.md`, and `docs/PUBLIC_LIST_FILTER_AUDIT.md`.

## 1. Executive Summary

I discovered 17 public-facing list or collection surfaces: the homepage’s embedded collections, location hierarchy collections, the dataset catalog and previews, reports, alerts, observations, biodiversity/species and occurrence collections, restoration, community, water bodies, monitoring stations, and organizations.

Overall design maturity: **Needs Improvement**. The frontend has a coherent visual vocabulary—green tokens, panels, chips, tags, tables, and a small number of card grids—but it does not yet behave as one discovery system. Most pages are server-rendered tables with page-specific filter markup. Search is present only for species, explicit result counts are inconsistent, sortable lists do not expose sort, and pagination controls are absent even where the API returns totals.

The most serious usability issue is access behavior: `(app)/layout.tsx` loads the current user but does not itself redirect; however, the public access intent in `docs/access-model.md` is not reflected consistently in the shell/navigation and must be verified end-to-end. Read-only collections should be anonymously browseable while write actions remain gated. This is a release-blocking product check because these are described as public environmental data surfaces.

Top usability issues:

- Most searchable/filterable lists have no search, no active-filter summary, no visible result count, and no clear-all pattern.
- Most API-paginated lists render only the first response page; only water bodies, stations, and organizations expose navigation.
- Mobile uses compressed inline toolbars rather than a filter drawer/sheet; long filter rows will be difficult to use at small widths.
- Empty, loading, and error behavior is inconsistent. Several zero-result messages are generic and there is no shared retry state in the list pages.
- Returning from a detail route has no explicit preservation mechanism for scroll position or list context.

Top consistency issues:

- `panel-header` is used by most legacy collection pages while `/organizations` uses `page-heading`; hierarchy and count placement differ.
- Category/severity filters are links; secondary filters are forms; reset is implemented only on some pages.
- Tables use `.table`, `.data-table`, `record-list`, and card grids without a clear entity-based rule.
- Status, category, severity, trust, access, and location labels are rendered through local mappings with no shared filter/label primitives.
- Pagination has at least three visual patterns: none, chip-based previous/next, and text-link previous/next.

Top pagination issues:

- `/reports`, `/alerts`, `/observations`, `/data`, `/restoration`, `/community`, and biodiversity occurrence/species surfaces receive paginated envelopes but provide no user navigation.
- Filter changes do not consistently reset `page=1` because most of these pages do not expose page state at all.
- `/water-bodies` correctly preserves filters in page links, but the form sends `class` while the page reads `hydrologicalClass`, so the class filter is not reliably applied.
- `/organizations` preserves `type` in pagination but uses a bespoke text-link treatment and no page-number navigation.

## 2. List Page Inventory

| Route | Page | Entity | Presentation | Search | Filters | Sort | Pagination |
|---|---|---|---|---|---|---|---|
| `/` | Public environmental board | Climate, alerts, reports, AQ, datasets, biodiversity, restoration, community | Map plus fixed previews, metric cards, compact lists | No global search | District/map context and section-specific fixed data | Fixed/API order | Fixed-size previews; none |
| `/locations` | Locations | Divisions with climate summaries | AQI/temperature card grid | No | None | No | Finite 8-division grid |
| `/locations/divisions/:id` | Division directory | Districts with climate summaries | AQI/temperature card grid | No | Route-scoped division | No | Finite hierarchy list |
| `/locations/districts/:id` | District environmental board | Forecast, alerts, occurrences, reports, observations, projects, upazilas | Mixed metric cards, tables, links, upazila cards | No | Route-scoped district | Mixed/API order | Fixed preview sections |
| `/locations/upazilas/:id` | Upazila directory | Unions plus local conditions | Cards/links and local summaries | No | Route-scoped upazila | No | Finite hierarchy list |
| `/data` | Data Hub | Datasets and provider preview | Dataset table plus provider record list | No | Category chips, access select | No | API envelope; no UI controls |
| `/data/:id` | Dataset detail with collection previews | Weather, air quality, flood, species, occurrences | Multiple fixed tables | No | None; fixed slices | No | Fixed `slice(0,10/20)` previews |
| `/reports` | Citizen Reports | Verified/resolved reports | Four-column table plus submission form | No | Category chips, status, district | No | API envelope; no UI controls |
| `/alerts` | Alerts and history | Active and expired alerts | Severity cards plus history table | No | Severity chips, hazard, district | No | API envelopes; no UI controls |
| `/observations` | Observations | Public environmental observations | Four-column table plus submission form | No | Category chips, trust, district | No | API envelope; no UI controls |
| `/biodiversity` | Species and recent occurrences | Species, GBIF occurrences | Two tables in separate panels | Species only | Occurrence district | No | Fixed occurrence `pageSize=10`; no controls |
| `/biodiversity/species/:id` | Species detail occurrence collection | Species occurrence records | Table | No | Species route scope | No | Fixed occurrence `pageSize=20`; no controls |
| `/restoration` | Restoration projects | Projects | Four-column table plus gated create/join actions | No | Category chips, status, district | No | API envelope; no UI controls |
| `/community` | Community feed | Posts and optional polls | Feed/table-like rows plus create form | No | District | API default order | API envelope; no UI controls |
| `/water-bodies` | Water-body registry | Rivers, wetlands, lakes | Four-column table | No | Class, type, district, upazila in UI intent | No | Previous/next with total pages |
| `/water-bodies/stations` | Monitoring stations | Water-level stations | Six-column table | No | Tidal status, district, upazila, water body | No | Previous/next with total pages |
| `/organizations` | Organization directory | Organizations | Three-column card grid | No | Type tabs | No | Previous/next; no page numbers |

Not discovered as public list routes: publications/researchers, forests, protected areas, agriculture items, and a dedicated weather/history directory. Those concepts appear in product/docs or embedded previews, but there is no corresponding public frontend route to audit.

## 3. UX Consistency Scorecard

Scores are evidence-based: 1 = materially deficient, 3 = mixed/usable with gaps, 5 = production-ready and consistent. The table is compact; detailed rationale follows in section 4.

| Route | Hierarchy | Filter | Pagination | Responsive | Accessibility | Overall |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 4 | 2 | 1 | 3 | 3 | 3/5 — Needs Improvement |
| `/locations` | 4 | 1 | 5 | 4 | 3 | 3/5 — Needs Improvement |
| `/locations/divisions/:id` | 4 | 1 | 5 | 4 | 3 | 3/5 — Needs Improvement |
| `/locations/districts/:id` | 3 | 1 | 1 | 3 | 3 | 2/5 — Poor |
| `/locations/upazilas/:id` | 3 | 1 | 5 | 3 | 3 | 3/5 — Needs Improvement |
| `/data` | 3 | 2 | 1 | 3 | 3 | 2/5 — Poor |
| `/data/:id` | 3 | 1 | 1 | 2 | 2 | 2/5 — Poor |
| `/reports` | 3 | 2 | 1 | 2 | 2 | 2/5 — Poor |
| `/alerts` | 4 | 2 | 1 | 3 | 3 | 3/5 — Needs Improvement |
| `/observations` | 3 | 2 | 1 | 2 | 2 | 2/5 — Poor |
| `/biodiversity` | 3 | 2 | 1 | 2 | 2 | 2/5 — Poor |
| `/biodiversity/species/:id` | 3 | 1 | 1 | 2 | 2 | 2/5 — Poor |
| `/restoration` | 3 | 2 | 1 | 2 | 2 | 2/5 — Poor |
| `/community` | 3 | 2 | 1 | 3 | 2 | 2/5 — Poor |
| `/water-bodies` | 3 | 3 | 3 | 2 | 2 | 3/5 — Needs Improvement |
| `/water-bodies/stations` | 3 | 3 | 3 | 1 | 2 | 2/5 — Poor |
| `/organizations` | 4 | 3 | 3 | 4 | 3 | 3/5 — Needs Improvement |

Overall maturity: **Needs Improvement**. No page meets “Excellent”; organizations and the finite location grids are the strongest current surfaces because their purpose is narrow and their cards are relatively scannable.

### Full ten-dimension score matrix

The headline table above is intentionally compact. This matrix records all requested dimensions for every inventoried route.

| Route | Info hierarchy | Search UX | Filter UX | Filter consistency | Sorting | Result presentation | Pagination | Responsive | Accessibility | Overall consistency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 4 | 2 | 2 | 2 | 2 | 4 | 1 | 3 | 3 | 3 |
| `/locations` | 4 | 1 | 1 | 2 | 1 | 4 | 5 | 4 | 3 | 3 |
| `/locations/divisions/:id` | 4 | 1 | 1 | 2 | 1 | 4 | 5 | 4 | 3 | 3 |
| `/locations/districts/:id` | 3 | 1 | 1 | 2 | 1 | 3 | 1 | 3 | 3 | 2 |
| `/locations/upazilas/:id` | 3 | 1 | 1 | 2 | 1 | 3 | 5 | 3 | 3 | 3 |
| `/data` | 3 | 1 | 2 | 2 | 1 | 3 | 1 | 3 | 3 | 2 |
| `/data/:id` | 3 | 1 | 1 | 1 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/reports` | 3 | 1 | 2 | 2 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/alerts` | 4 | 1 | 2 | 2 | 1 | 4 | 1 | 3 | 3 | 3 |
| `/observations` | 3 | 1 | 2 | 2 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/biodiversity` | 3 | 3 | 2 | 2 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/biodiversity/species/:id` | 3 | 1 | 1 | 1 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/restoration` | 3 | 1 | 2 | 2 | 1 | 3 | 1 | 2 | 2 | 2 |
| `/community` | 3 | 1 | 2 | 2 | 1 | 3 | 1 | 3 | 2 | 2 |
| `/water-bodies` | 3 | 1 | 3 | 3 | 1 | 3 | 3 | 2 | 2 | 3 |
| `/water-bodies/stations` | 3 | 1 | 3 | 3 | 1 | 2 | 3 | 1 | 2 | 2 |
| `/organizations` | 4 | 1 | 3 | 3 | 1 | 4 | 3 | 4 | 3 | 3 |

Scores are intentionally low for search and sorting because absence of a control is a 1 where the entity is large or discovery-oriented; finite location grids receive 5 for pagination because no pagination is needed at their current bounded size.

## 4. Page-by-Page Audit

### `/`

**Current design:** A public dashboard composed of `MapSection`, climate bands, metrics, alert/report previews, biodiversity/restoration sections, and `DatasetPreview`. The map links district, alert, and report markers but does not provide a shared list state.

**Strengths:** Strong citizen-first orientation; emergency content is visually prominent; map and summary sections are easy to understand at a glance; fixed previews avoid overwhelming the homepage.

**Problems:** No global search; no result counts tied to destination routes; map filters do not become URL state; preview sections use mixed live/fallback behavior; no consistent “view all” affordance or freshness treatment across lists.

**Recommended changes:** Keep the homepage as an orientation surface. Add explicit “Explore all” links with filter handoff, map layer toggles, source/freshness labels, and a district selector that produces shareable URLs. Do not add expert filters to the homepage.

**Pagination recommendation:** None on the homepage; link to paginated collection pages.

**Mobile recommendation:** Preserve the map/list relationship with a visible layer toggle and stacked preview cards; keep emergency banner and alert content above secondary sections.

**Severity:** P1 for missing handoff/state; P2 for preview consistency.

### `/locations`, `/locations/divisions/:id`, `/locations/upazilas/:id`

**Current design:** Hierarchical location navigation with division/district climate cards and union links. `LocationBreadcrumb` provides context.

**Strengths:** Narrow information architecture; cards present temperature, AQI, rainfall, and UV consistently; hierarchy is predictable.

**Problems:** No name search, no indication that a location lacks data versus has no records, no visible data freshness on every card, and no common directory toolbar. Card grids are domain-specific but use different conventions from organizations.

**Recommended changes:** Add name search only where lists grow; expose data availability and last-updated context; use A–Z as the only default sort for directory views. Keep climate metric sorting inside a separate comparison view.

**Pagination recommendation:** No pagination for divisions or small finite hierarchies; add it only when API results become large.

**Mobile recommendation:** One-column cards, full-card links, visible breadcrumb, and no compressed climate metric columns.

**Severity:** P2.

### `/locations/districts/:id`

**Current design:** A mixed local environmental board containing forecast, climate, active alerts, biodiversity, reports, observations, restoration projects, and upazilas.

**Strengths:** High local relevance; route context is clear; sections are grouped by domain.

**Problems:** It is a dense dashboard rather than a predictable collection page; child lists use fixed previews without counts or “view all” links; no section-level sort/date labels; the user cannot transfer the district context to the canonical collection routes in a consistent way.

**Recommended changes:** Treat each section as a preview with a count, freshness label, and canonical “View all in this district” link. Keep this page as a local board rather than adding a cross-domain filter jungle.

**Pagination recommendation:** None inside the board; canonical list routes handle pagination.

**Mobile recommendation:** Stack sections; make tables horizontally scrollable or transform them to compact cards; keep the district header and current conditions visible.

**Severity:** P1.

### `/data`

**Current design:** Category chip links, access select, dataset table, and a fixed provider record list.

**Strengths:** Table columns are appropriate for a catalog; access labels are understandable; category taxonomy is visible.

**Problems:** No dataset search or count; category links drop `accessPolicy`; no active chips/clear all; provider preview is not a complete directory; API pagination is not exposed; access filter exists in the form but not in the category navigation state.

**Recommended changes:** Use a catalog header with search, category/access P0 filters, result count, sort, active chips, and pagination. Move providers to a dedicated directory or label the section explicitly as a preview. Add researcher-only advanced metadata progressively.

**Pagination recommendation:** Numbered pagination with `?search=&category=&accessPolicy=&sort=&page=&pageSize=`; page size 20/50 for researchers, no selector for casual users.

**Mobile recommendation:** Search stays visible; filters move to a drawer; table becomes stacked dataset cards with category/access metadata.

**Severity:** P1; P2 for provider preview.

### `/data/:id`

**Current design:** Dataset detail with endpoint codes and fixed preview tables for weather, air quality, flood, species, and occurrences.

**Strengths:** Domain-specific previews are more useful than a generic placeholder; endpoint provenance is visible.

**Problems:** Fixed slices make the tables look complete when they are previews; no “show all”/pagination; tables are not responsive enough for four-column data; no consistent source freshness/version/coverage block; no sort/filter controls where users are likely to expect them.

**Recommended changes:** Label every table “Preview”; add an explicit full-explorer link and version/freshness metadata. Do not turn this detail route into a universal filter page.

**Pagination recommendation:** Preview only, no pagination; link to dedicated weather/species/occurrence explorers when available.

**Mobile recommendation:** Convert dense rows to label/value cards or horizontal scroll with a visible scroll hint.

**Severity:** P1 for misleading fixed previews; P2 for polish.

### `/reports`

**Current design:** Category chips, status/district form, four-column table, submission form, and status-flow explainer.

**Strengths:** Citizen terminology is understandable; reviewed-publication policy is explained; report rows are compact and scannable.

**Problems:** No search, count, date, sort, active chips, clear-all, or pagination. Category links drop status/district state. The list and contribution form compete for attention. Empty copy says only “category,” even when other filters are active. Table uses ARIA roles without full row/cell semantics.

**Recommended changes:** Put discovery first: search, category, district, public status; result toolbar; table/card results; then gated submission CTA. Preserve all URL state in category links and reset page on changes. Use “No verified reports match these filters” plus clear filters.

**Pagination recommendation:** Numbered pagination for deterministic public records; optionally offer nearby mode as an explicit location filter, not infinite scroll.

**Mobile recommendation:** Search plus `[Filters (n)] [Sort]`; use compact report cards rather than a six-column equivalent; keep the submission CTA below results.

**Severity:** P0 for missing subsequent pages; P1 for state loss and mobile filtering.

### `/alerts`

**Current design:** Header, emergency strip, severity chips, hazard/district form, active alert cards, expired-history table, subscription note.

**Strengths:** Emergency alert is prominent; cards support rapid scanning; active versus expired content is separated conceptually.

**Problems:** Severity links drop hazard/district; no count, search, sort, explicit active/history tabs, or pagination; expired history is not filterable by date; history and active results do not share a result-toolbar pattern.

**Recommended changes:** Use Active/History tabs with severity, hazard, district, and date filters. Default active sort is severity then issued time; history defaults to newest issued. Keep “no active alerts right now” distinct from filtered zero results and show freshness/source.

**Pagination recommendation:** Numbered pagination for history; active alerts may use a bounded list with pagination if volume grows.

**Mobile recommendation:** Keep emergency strip first; stack cards; move secondary filters into a drawer and keep severity as visible chips.

**Severity:** P1.

### `/observations`

**Current design:** Category chips, trust/district form, four-column table, and authenticated submission form.

**Strengths:** Trust level is a useful domain signal; table is compact; submission guidance explains verification.

**Problems:** No search, count, date, sort, active chips, pagination, map/nearby mode, or robust empty/error states. Category links drop trust/district. “Observation” rows do not identify species/measurement in the list. The list is coupled to authenticated submission.

**Recommended changes:** Separate public discovery from contribution CTA. Add category, district, trust, date, nearby, and search progressively. Show species/parameter/location as the primary result hierarchy when data supports it. Explain research-grade/community/unverified in a shared legend.

**Pagination recommendation:** Numbered pagination for researcher comparison; a separate nearby feed can use load more with a fallback page link.

**Mobile recommendation:** Filter drawer and compact observation cards; do not compress the table into unreadable columns.

**Severity:** P0 for missing page navigation; P1 for missing quality/spatial discovery.

### `/biodiversity` and `/biodiversity/species/:id`

**Current design:** Species search table and recent occurrence table on one page; species detail contains a fixed occurrence table.

**Strengths:** Scientific names are italicized; species search is URL-backed; taxonomy fields are suitable for researchers; source freshness is described.

**Problems:** The two audiences/tasks are mixed. Occurrence district is a second GET form that preserves species search but not a coherent shared state; occurrence list is fixed-size; no taxonomy/date/basis/source filters; no counts in the toolbar; no clear distinction between species records and occurrence records.

**Recommended changes:** Make Species and Occurrences tabs or distinct routes. Keep species search simple for citizens; add taxonomy and provenance filters under advanced controls. Give occurrences their own explorer with location/date/basis/source and numbered pagination.

**Pagination recommendation:** Numbered pagination for both species and occurrence research; no infinite scroll.

**Mobile recommendation:** One-column species cards or stacked rows; occurrence cards should show species, district, observed date, and basis before secondary metadata.

**Severity:** P1.

### `/restoration`

**Current design:** Category chips, status/district form, four-column project table, and gated create/join actions.

**Strengths:** Category taxonomy is domain-appropriate; status tags are visible; join action is placed near participant count.

**Problems:** No search, count, active chips, pagination, sort, or organization filter. Category links drop status/district. Inline join forms inside table rows increase interaction density and complicate responsive behavior. Empty state does not suggest broadening location/status.

**Recommended changes:** Use active-first result toolbar; expose category/status/location; add organization autocomplete only when supported. Keep create/register as a separate CTA and join as a row/card action with clear authentication feedback.

**Pagination recommendation:** Numbered pagination; 20 items per page is appropriate for a directory.

**Mobile recommendation:** Project cards with title, status, location, organization, participants, and one CTA; no nested form in a dense table row.

**Severity:** P1.

### `/community`

**Current design:** District-scoped feed/table of posts, plus a gated create-post form and poll builder.

**Strengths:** Feed is the right mental model; district is a meaningful location filter; post creation is clearly separate from reading for unauthenticated users.

**Problems:** No search, result count, sort/ranking label, pagination control, load-more affordance, active chip, or robust filtered empty state. API order is implicit, so users cannot tell whether results are newest or activity-ranked.

**Recommended changes:** Define a deterministic ranking contract before adding sort. Add title/body search only if full-text support exists. Use a feed-specific load-more pattern with accessible button and retained position, or numbered pagination if comparison/shareability becomes important.

**Pagination recommendation:** Load more is acceptable for casual browsing, but provide URL-backed page fallback for accessibility and sharing.

**Mobile recommendation:** One-column feed cards, sticky create CTA only if it does not obscure reading, district filter in drawer.

**Severity:** P1 for absent navigation; P2 for search/sort.

### `/water-bodies`

**Current design:** Four-filter inline form, mixed water-body table, reset button, and chip-based previous/next pagination.

**Strengths:** The only major registry page exposing visible pagination; filter state is mostly preserved in `pageHref`; class/type/location concepts are appropriate.

**Problems:** The form uses `name="class"` while the page reads `searchParams.hydrologicalClass`, so the class selection can fail to round-trip. No search, count, sort, active chips, or page numbers. Table rows have only an inline title link; long location/transboundary content will wrap poorly.

**Recommended changes:** Normalize query key to one contract; expose lotic/lentic as a top-level choice; add name/code search and result count. Use class-specific metadata and labels. Replace “Reset” with clear-all chips when multiple filters are active.

**Pagination recommendation:** Numbered pagination with previous/next and total pages; preserve all filters; reset to page 1 on any filter change.

**Mobile recommendation:** Filter drawer; result cards should lead with name, Bangla name, type/class, and location; keep table view for desktop/researcher users.

**Severity:** P0 for class filter state mismatch; P1 for mobile and discovery gaps.

### `/water-bodies/stations`

**Current design:** Tidal chips, district/upazila/water-body selects, reset, six-column table, chip-based pagination.

**Strengths:** URL state includes most meaningful filters; station code, river, tidal status, and linked bodies are useful researcher metadata; pagination preserves filters.

**Problems:** No station search, result count, sort, reading freshness, threshold/trend filter, or visible upazila reset behavior. Six columns are not viable on small screens. Reset clears district/water body but can leave other filters unintentionally.

**Recommended changes:** Add search by station/name/code; show “latest reading” availability and timestamp; sort by warning/rising trend/newest reading/name when API supports it. Make reset clear every filter.

**Pagination recommendation:** Numbered pagination for monitoring/research; page size 30 is reasonable, but expose size only to data-heavy users.

**Mobile recommendation:** Card mode is required; show station name/code, current status, river, tidal status, latest reading, and water-body link. Keep table only at larger breakpoints.

**Severity:** P1; responsive severity is P0/P1 depending on actual viewport testing.

### `/organizations`

**Current design:** `page-heading`, type tab navigation, three-column organization card grid, and previous/next text links.

**Strengths:** Best header/count treatment among directory pages; cards have stable height, clear title, type kicker, verified/member badges, and full-card link focus styling; responsive grid collapses to one column.

**Problems:** No name search or active-filter chips; no page numbers/first-last controls; authentication behavior conflicts with the documented public directory intent and API access policy must be aligned; type tab links drop page state by design but should intentionally reset to page 1.

**Recommended changes:** Decide public read access first. Add name search, result toolbar, accessible shared pagination, and optional provider/member relationship labels only when meaningful to the audience.

**Pagination recommendation:** Numbered pagination for a directory; preserve `type` and `search`.

**Mobile recommendation:** Existing one-column card behavior is appropriate; keep the count and filter control near the heading.

**Severity:** P1 for access-policy mismatch; P2 for search/pagination polish.

## 5. Filter Design Consistency

### Current patterns

- Category/severity/tidal choices are link-based chips on reports, observations, data, restoration, alerts, and stations.
- Secondary filters are native `<select>` controls inside `.toolbar` forms.
- `DistrictSelect` is reused for contribution forms, but discovery pages each fetch and render their own district select.
- Only water bodies and stations expose an explicit reset; organizations uses route tabs with no clear-all concept.
- There is no `SearchInput`, `FilterBar`, `FilterDrawer`, `ActiveFilterChips`, `ResultToolbar`, or shared `SortSelector` implementation.

### Inconsistencies and state-loss findings

| Page | Finding | Severity |
|---|---|---|
| Reports | Category links omit existing status and district query state | P1 |
| Observations | Category links omit trust and district query state | P1 |
| Data | Category links omit access policy | P1 |
| Restoration | Category links omit status and district query state | P1 |
| Alerts | Severity links omit hazard and district query state | P1 |
| Water bodies | Form submits `class`, page reads `hydrologicalClass`; filter contract mismatch | P0 |
| Stations | Reset link clears only some filters and can leave tidal/upazila state | P1 |
| All major lists | No active-filter chips, clear-all, or consistent result count | P1 |

### Recommended shared primitives

Map current equivalents first:

| Responsibility | Existing implementation | Recommendation |
|---|---|---|
| Page header | `.panel-header`, `.page-heading` | Shared `PageHeader` with optional count, description, action |
| Search | Species form only | `SearchInput` with label, clear, submit/debounce policy, URL state |
| Location | `DistrictSelect`, local native selects | `LocationFilter` with dependent division/district/upazila/union values |
| Categorical filters | Page-local chips and arrays | `FilterBar` + domain filter definitions; keep domain labels local |
| Advanced filters | None | `FilterDrawer`/sheet on mobile; “More filters” on desktop |
| Active filters | Water-body reset only | `ActiveFilterChips` with individual remove and clear all |
| Sort | None | `SortSelector` with domain-valid options only |
| Result toolbar | None | `ResultToolbar` for count, active chips, sort, view toggle |
| Pagination | Inline page links in 3 pages | Shared `Pagination` with labels, current page, total, URL preservation |
| Empty | Inline `.empty-state` strings | `EmptyState` variants: initial, filtered, unavailable, no active alerts |
| Error | Route-level error only; raw action errors elsewhere | `ErrorState` with readable message and retry |
| Loading | Route-level spinners and custom reports/biodiversity skeletons | Entity-aware skeletons that preserve final layout |
| Cards/tables | `.content-card`, `.division-card`, `.alert-card`, `.table` | Keep domain variants, share primitives for spacing, focus, metadata, and responsive behavior |

Do not abstract genuinely different controls into one universal component: alert severity, biodiversity taxonomy, hydrological class, and community feed ranking need domain-specific definitions while sharing shell behavior.

## 6. Pagination Audit

| Route | Current Pattern | Recommended Pattern | URL State | Problems |
|---|---|---|---|---|
| `/` | Fixed previews | Link to canonical pages | Anchor/map only | No list navigation or context handoff |
| `/data` | None despite paginated envelope | Numbered | `search,category,accessPolicy,sort,page,pageSize` | Users cannot reach later datasets |
| `/reports` | None despite paginated envelope | Numbered | `search,category,status,location,sort,page` | Later records inaccessible; filters not preserved in chip links |
| `/alerts` | None for active/history | Numbered history; bounded active | `status,severity,alertType,district,sort,page` | History cannot be browsed deterministically |
| `/observations` | None despite paginated envelope | Numbered; optional nearby load more | `search,category,trust,location,date,sort,page` | Research comparison is difficult |
| `/biodiversity` | Fixed species/occurrence requests | Numbered per explorer | `search,taxonomy,location,date,source,sort,page` | Fixed slices look complete |
| `/biodiversity/species/:id` | Fixed 20 occurrence records | Numbered occurrence list | `speciesId,location,date,basis,page` | Detail page hides additional records |
| `/restoration` | None despite paginated envelope | Numbered | `search,category,status,location,sort,page` | Cannot browse full project directory |
| `/community` | None despite paginated envelope | Load more with page fallback | `district,search,sort,page` | Feed stops without an affordance |
| `/water-bodies` | Previous/next + total pages | Shared numbered + previous/next | `class,type,district,upazila,search,sort,page,pageSize` | Class key mismatch; no page numbers/count toolbar |
| `/water-bodies/stations` | Previous/next + total pages | Shared numbered + previous/next | `search,district,upazila,waterBody,tidal,sort,page,pageSize` | No count; reset incomplete; mobile table fails |
| `/organizations` | Previous/next text links | Shared numbered directory pagination | `search,type,sort,page,pageSize` | No page numbers/first-last; access policy unresolved |

Global pagination rules: server-sort the complete result set; use `page` and `pageSize`; omit default values from URLs; reset page to 1 when any filter/search/sort changes; preserve all unrelated filters; expose `aria-current="page"`, “Go to page N,” “Previous,” and “Next”; restore focus to the results heading after navigation where client behavior is introduced.

## 7. Result Card / Table Consistency

### Cards

Organizations have the strongest card pattern: stable height, full-card link, focus ring, title/kicker/meta hierarchy, and responsive 3→2→1 columns. Alert cards are also scannable but have long descriptions and no shared metadata footer. Division cards are useful for environmental comparison but are specialized and should not be forced into the organization pattern. Restoration should become cards on mobile because nested join actions are awkward inside table rows.

Recommended card rule: title first, one-line location/source/status row second, one primary metric or date third, no more than 2–3 badges, and a full-card link with one explicit secondary action where needed. Avoid hover-only information; the organization arrow currently appears only on hover/focus, so it must remain supplementary.

### Tables

Reports, observations, datasets, water bodies, stations, alerts history, and biodiversity use a custom div-based `.table` with `role="table"`, but rows/cells do not consistently expose `role="cell"`, row groups, or column headers. This is less robust than a semantic `<table>` for desktop data. Restoration and water bodies use inline links/forms inside rows, increasing interaction complexity.

Desktop recommendation: use semantic tables for true comparison tasks, with 4–6 columns, clear primary column, consistent tag treatment, and a sticky header only on long data-heavy pages. Mobile recommendation: transform to cards for reports, observations, projects, stations, and alerts; allow horizontal scrolling only for researcher-grade dense data with a visible cue.

### Grid standards

- Organizations: 3 columns desktop, 2 tablet, 1 mobile; keep.
- Locations: 4/2/1 only if card content remains legible; current `division-grid` should be verified at the declared breakpoints.
- Alerts: 2 columns desktop, 1 mobile; keep card density modest.
- Restoration/projects: 3/2/1 cards on mobile; do not use a dense table for citizen browsing.
- Research/data catalogs: table desktop, card/table toggle on mobile; do not force a marketing-style grid onto metadata-heavy datasets.

## 8. Mobile UX Audit

The CSS has useful breakpoint coverage, but the collection implementations do not provide a mobile-specific filter model. `.toolbar` is a flex row with wrapping, so pages with 3–5 labels/selects/buttons will become tall, awkward rows rather than a deliberate filter surface. There is no mobile drawer/sheet, filter count badge, sticky Apply/Reset, or explicit sort control.

Most at risk:

- `/water-bodies/stations`: six columns are not viable on a narrow viewport; card mode is required.
- `/water-bodies`: four filters plus buttons need a drawer; long location/transboundary values will wrap.
- `/reports`, `/observations`, `/restoration`: table rows and inline forms/actions are difficult to scan and operate.
- `/data`: metadata table should become stacked cards or support a deliberate horizontal-scroll treatment.
- `/alerts`: cards are viable, but history table needs card transformation.
- `/biodiversity`: two tables in stacked panels need separate mobile task framing.

Preferred mobile structure for applicable pages:

`PageHeader` → search → `[Filters (n)] [Sort]` → active chips → result count → cards/table → pagination.

The filter drawer should include Reset and Apply, show dependent location fields in order, and preserve the user’s current form values until Apply. Do not make filter controls sticky on every page; only long data pages and map/list layouts warrant sticky controls.

## 9. Shared Component Recommendations

The repository currently has no shared list-page discovery component library in `packages/ui`; `packages/ui/src/index.ts` is only a package entry point and the concrete collection styles live in `apps/web/app/globals.css`.

Recommended consolidation sequence:

1. Build `PageHeader`, `SearchInput`, `FilterBar`, `ActiveFilterChips`, `ResultToolbar`, `SortSelector`, `Pagination`, `EmptyState`, and `ErrorState` around URL/query-state contracts.
2. Add `LocationFilter` using the existing `DistrictSelect` data shape and dependent hierarchy behavior.
3. Add `FilterDrawer` for mobile and a desktop “More filters” disclosure.
4. Migrate reports, alerts, observations, restoration, data, water bodies, stations, and organizations first.
5. Keep specialized `TaxonomyFilter`, alert severity definitions, and hydrological class definitions as domain configuration rather than separate visual systems.

Shared component impact should be measured by behavior, not visual sameness: cards and tables may differ by entity, but filter placement, URL state, active chips, count, empty, loading, error, and pagination should feel identical.

## 10. Recommended List Page Standard

### Desktop

```text
PageHeader
  title + concise supporting text + result count when available + primary action
SearchInput
Primary filters (2–4 P0 controls)
More filters (P1/P2, progressive disclosure)
ActiveFilterChips + Clear all
ResultToolbar
  result count                                      Sort  View toggle (if useful)
Results
  cards / semantic table / map + list
Pagination
```

Rules:

- Search is server-backed for large collections and represented as `search=`.
- All meaningful state is shareable: `search`, domain filters, `sort`, `page`, and optional `pageSize`.
- Category chips and tabs must preserve unrelated state or intentionally reset it with an explicit page-1 transition.
- Result counts describe the current filtered result set, not a separate metric unless clearly labeled.
- Advanced controls are audience-aware: citizen defaults are location/status/category; expert controls add date/quality/spatial context; researchers add provenance/taxonomy/coverage only where the data contract supports them.
- Empty states distinguish initial empty, filtered empty, unavailable data, and API error. Every filtered empty state offers Clear filters and a broader alternative.
- Loading states preserve final geometry and disable only controls that cannot safely be changed during the request. Avoid full-page spinners for small list refreshes.

### Mobile

```text
PageHeader
SearchInput
[Filters (active count)] [Sort]
ActiveFilterChips (horizontal scroll if needed)
Result count
Cards or transformed rows
Pagination / Load more
```

Use a drawer/bottom sheet for filters with Apply and Reset. Use load more only for Community-style casual feeds, with retained scroll and a page/share fallback. Use numbered pagination for directories, datasets, research records, station registries, and comparison tasks.

## 11. Accessibility Findings

### P0/P1

- Div-based tables do not consistently provide semantic cells/header associations; migrate true data tables to semantic `<table>` or complete the ARIA grid/table model.
- Dense mobile tables lack a declared card transformation or an accessible horizontal-scroll strategy.
- Pagination is absent on most paginated results; where present, labels such as “Go to page 3” and a clear current-page announcement are missing.
- Filter state changes are not announced through a result-count/status region; users may not know that the result set changed.
- Nested forms/buttons inside restoration table rows create complex keyboard traversal and should become card actions or a separate action column.

### P2/P3

- Icon-only navigation controls have labels in the sidebar, but future clear/search/sort icon buttons must retain visible or assistive labels.
- Focus styling exists for organization cards and form controls, but shared focus treatment is not defined for chips, table links, pagination, or reset controls.
- Color tags communicate status but need text labels retained, contrast verification, and no color-only distinction for severity/trust/access.
- Touch target sizing should be standardized at approximately 44px for chips, pagination, reset, and mobile drawer actions.
- Native select labels are present on current forms; shared controls should preserve explicit labels rather than relying on placeholders.

## 12. Implementation Backlog

### P0

- **All public collection routes** — Verify/fix anonymous read access while keeping submit/join/download/profile actions gated. Shared component impact: public/app shell boundary. API dependency: none. Complexity: M. Severity: P0.
- **`/water-bodies`** — Fix `class` versus `hydrologicalClass` query contract and add regression coverage for filter round-trip. Shared component impact: filter definitions. API dependency: existing API. Complexity: S.
- **`/reports`, `/observations`, `/data`, `/restoration`, `/alerts`** — Preserve all active query state when category/severity links change. Shared component impact: URL-state helper. API dependency: none. Complexity: M.
- **`/reports`, `/observations`, `/water-bodies/stations`** — Replace or transform dense rows for mobile and provide keyboard-safe interaction. Shared component impact: responsive result renderer. API dependency: none initially. Complexity: M.
- **All API-paginated lists** — Add shared pagination and page-reset behavior; unblock access to subsequent records. Shared component impact: `Pagination`, `ResultToolbar`. API dependency: ensure stable totals/order. Complexity: L.

### P1

- **All filterable lists** — Add shared search/filter bar, active chips, clear all, result count, and mobile drawer. Shared component impact: core discovery system. API dependency: existing filters first; new search/sort later. Complexity: L.
- **`/alerts`** — Add active/history tabs, district/hazard filters, severity-first sort, count, freshness, and history pagination. Shared component impact: `StatusFilter`, `SortSelector`, `Pagination`. API dependency: sort/date/search for advanced history. Complexity: M.
- **`/reports`** — Add location/status/search/date discovery and numbered pagination; separate contribution CTA from result list. Shared component impact: location/status filters. API dependency: search/date/sort; nearby endpoint already exists. Complexity: L.
- **`/observations`** — Add trust/location/date/nearby/search and a researcher-safe occurrence hierarchy. Shared component impact: location/date/quality filters. API dependency: date/search/measurement queries. Complexity: L.
- **`/restoration`** — Add status/location/search/sort/pagination and mobile cards; simplify join action. Shared component impact: result card/pagination. API dependency: organization/search/sort. Complexity: M.
- **`/biodiversity` and species detail** — Split species and occurrence explorers; add taxonomy/location/date/basis/source pagination. Shared component impact: taxonomy/source filters. API dependency: occurrence/taxonomy query support. Complexity: L.
- **`/water-bodies` and stations** — Add search, count, sort, active chips, semantic/card rendering, and complete reset behavior. Shared component impact: registry result renderer. API dependency: station status/search/sort. Complexity: L.
- **`/data`** — Add catalog search, access filter parity, metadata/provenance, and numbered pagination. Shared component impact: researcher catalog toolbar. API dependency: dataset search/metadata fields. Complexity: L.
- **`/organizations`** — Align public access policy, add search, shared pagination, and preserve type. Shared component impact: organization directory. API dependency: anonymous organization list policy. Complexity: M.
- **All true tables** — Add semantic table headers/cells and consistent mobile transformation. Shared component impact: `ResponsiveTable`/card renderer. API dependency: none. Complexity: L.

### P2

- **`/locations` hierarchy** — Add name search/data-availability states when directory size or citizen demand justifies it. Shared component impact: location filter/search. API dependency: availability summary. Complexity: M.
- **`/community`** — Define ranking semantics and add search/sort plus load-more/page fallback. Shared component impact: feed pagination. API dependency: full-text/ranking contract. Complexity: M.
- **`/data/:id`** — Label previews, expose source/version/freshness, and link to canonical explorers. Shared component impact: preview table and provenance block. API dependency: version/distribution metadata. Complexity: M.
- **Homepage map and previews** — Add explicit layer toggles, freshness, counts, and location-filter handoff to canonical lists. Shared component impact: map/list bridge. API dependency: map bounds only if viewport filtering is added. Complexity: M.
- **All statuses/tags** — Centralize visible English/Bangla labels and explanations; preserve text meaning independent of color. Shared component impact: tag/label tokens. API dependency: none. Complexity: S.

### P3

- **All collection pages** — Standardize spacing, chip/button heights, focus rings, pagination iconography, and inline style removal. Shared component impact: design tokens and primitives. API dependency: none. Complexity: M.
- **Cards and table metadata** — Normalize ordering, date formatting, badge density, and CTA alignment per entity type. Shared component impact: card/table variants. API dependency: none. Complexity: M.
- **Finite location cards** — Add subtle freshness/source affordances and verify contrast at all AQI states. Shared component impact: location card tokens. API dependency: none. Complexity: S.

### API dependencies to track separately

New search/sort/date/coverage parameters are required for several routes. Do not fake these client-side over truncated API responses. The most important additions are deterministic `sort`, full-text `search`, date ranges for reports/observations/occurrences/alerts, dataset metadata filters, station reading status, and historical weather/AQ list contracts. A dedicated `/weather` or `/conditions` route, `/biodiversity/occurrences`, and public provider directory are product gaps rather than missing UI on an existing list route.

# Delta Signal — DESIGN.md

> Canonical design specification for the Delta Signal frontend.
>
> This document applies to ALL frontend experiences:
>
> - Public website
> - Public environmental data pages
> - Maps and GIS views
> - Research and dataset pages
> - Authentication
> - Authenticated workspace
> - User dashboards
> - Data contribution and moderation
> - Administration
>
> Do not create an independent visual language for individual modules.
> Public and authenticated experiences may have different density and layout,
> but they must use the same foundations, components, environmental semantics,
> and data-visualization language.

---

# 1. Product Identity

Delta Signal is an environmental intelligence and public-data platform focused
on Bangladesh.

It brings together:

- environmental observations
- forecasts
- geographic information
- weather and climate data
- rivers and water bodies
- biodiversity
- forests and land
- agriculture
- marine information
- radiation
- emissions
- environmental facilities
- research
- datasets
- citizen reports
- organizations and researchers

The product should communicate:

- scientific credibility
- environmental awareness
- geographic context
- transparency
- calm authority
- technical competence
- accessibility
- trustworthiness

Delta Signal should feel like:

> Modern environmental observatory + GIS platform + scientific data portal.

It must NOT feel like:

- a generic admin template
- a government portal from the 2000s
- a news website
- a social network
- a cryptocurrency dashboard
- a gaming interface
- a futuristic command center
- a collection of unrelated modules

---

# 2. Design Principles

## 2.1 Data First

Environmental information is the primary visual content.

Maps, measurements, trends, alerts, geographic context, research, and sources
should receive more visual emphasis than decoration.

Never add visual complexity that makes data harder to understand.

---

## 2.2 Geographic by Default

Environmental information usually has geographic meaning.

Where relevant, interfaces should make location visible.

Preferred hierarchy:

Bangladesh → Division → District → Upazila

Maps should be used when geography improves understanding, not simply as
decoration.

---

## 2.3 Progressive Complexity

Delta Signal serves different audiences.

A citizen should understand the main message quickly.

A researcher or environmental professional should be able to investigate the
underlying information.

Prefer:

Summary
→ Context
→ Visualization
→ Detail
→ Methodology
→ Source
→ Raw data

Do not expose every technical detail at the first level.

---

## 2.4 Evidence Is Part of the Interface

Environmental claims should expose appropriate provenance.

Where applicable show:

- source
- timestamp
- unit
- geographic coverage
- observation/forecast status
- methodology
- license
- last update

Source information must not be hidden in obscure footers.

---

## 2.5 Calm, Not Sensational

Environmental risk must be communicated clearly without unnecessary alarm.

Do not use dramatic colors, copy, animation, or icons unless the underlying
classification justifies them.

---

## 2.6 Consistency Over Novelty

A familiar component should look and behave the same throughout Delta Signal.

Do not create a new:

- card
- table
- filter
- alert
- button
- badge
- chart style
- map control

for every module.

Reuse established patterns.

---

# 3. Experience Architecture

Delta Signal has ONE design system with multiple experience modes.

## 3.1 Public Experience

Purpose:

- discovery
- environmental awareness
- public data exploration
- research discovery
- citizen engagement
- SEO and external sharing

Characteristics:

- spacious
- visual
- map-forward
- editorial
- approachable
- larger typography
- progressive disclosure
- environmental imagery where appropriate

Examples:

- Landing page
- Explore
- Public map
- Environmental indicators
- Location pages
- Research
- Researchers
- Datasets
- Biodiversity
- Water bodies
- Facilities
- Citizen reports

---

## 3.2 Authenticated Workspace

Purpose:

- analysis
- contribution
- moderation
- management
- collaboration
- personalization
- administration

Characteristics:

- compact
- information-dense
- task-oriented
- persistent navigation
- reduced decorative imagery
- advanced filters
- tables
- maps
- analytical views
- actionable states

Examples:

- Dashboard
- My reports
- Observations
- Data contribution
- Research workspace
- Dataset management
- Collections
- Moderation
- Organizations
- Notifications
- User management
- Settings
- Administration

---

## 3.3 Authentication Experience

Login, registration, verification, password reset, and onboarding should be
simple and visually connected to Delta Signal.

Authentication screens should NOT inherit the density of the workspace.

Use:

- simple centered or split layout
- clear branding
- minimal distraction
- strong form hierarchy

---

# 4. Design System Architecture

The frontend design system consists of four layers:

## Foundation

- colors
- typography
- spacing
- grid
- radius
- borders
- elevation
- icons
- motion

## Components

- buttons
- inputs
- selects
- cards
- badges
- tabs
- tables
- dialogs
- drawers
- navigation
- filters
- empty states

## Data & GIS

- maps
- charts
- indicators
- alerts
- legends
- sources
- environmental classifications
- uncertainty

## Experience Patterns

- Public
- Workspace
- Authentication

Do not bypass these layers with page-specific styling unless necessary.

---

# 5. Theme

Delta Signal supports Light and Dark modes.

Light mode is the primary public experience.

Dark mode should be fully supported, particularly for:

- maps
- monitoring
- dashboards
- prolonged analytical use

Avoid pure white and pure black as major backgrounds.

---

# 6. Light Theme

Background:

`#F7F9F8`

Primary Surface:

`#FFFFFF`

Secondary Surface:

`#F1F5F3`

Elevated Surface:

`#FFFFFF`

Primary Text:

`#17201D`

Secondary Text:

`#5F6F68`

Muted Text:

`#87948F`

Border:

`#DDE5E1`

Strong Border:

`#CBD7D1`

---

# 7. Dark Theme

Background:

`#101513`

Primary Surface:

`#171D1A`

Secondary Surface:

`#1D2521`

Elevated Surface:

`#222B27`

Primary Text:

`#F4F7F5`

Secondary Text:

`#AAB7B1`

Muted Text:

`#78857F`

Border:

`#2D3833`

Strong Border:

`#3B4942`

---

# 8. Brand Palette

The palette should evolve from the existing Delta Signal visual identity rather
than replacing it.

## Delta Green

`#178A63`

Primary brand color.

Use for:

- primary actions
- active navigation
- selected controls
- brand emphasis

---

## Deep Delta

`#0D5F4A`

Use for:

- strong emphasis
- dark brand surfaces
- selected states
- prominent headings where appropriate

---

## Water Blue

`#2878B5`

Use for:

- rivers
- hydrology
- water
- rainfall where appropriate

---

## Sky Blue

`#4A9FD8`

Use for:

- weather
- atmospheric data
- precipitation

---

## Biodiversity Green

`#4E8B57`

Use for:

- biodiversity
- forests
- vegetation
- ecosystems

---

## Earth

`#9A7146`

Use sparingly for:

- soil
- terrain
- land
- agriculture

These domain colors do NOT replace semantic alert colors.

---

# 9. Semantic Colors

Normal / Healthy:

`#2E9B66`

Information:

`#3388C7`

Watch:

`#D9A323`

Warning:

`#E67E22`

Critical:

`#D64545`

Unknown / unavailable:

`#7B8782`

Rules:

- Red is semantic, not decorative.
- Orange/yellow must not automatically imply disaster.
- Green must not automatically mean "environmentally good."
- Never communicate severity using color alone.
- Pair status colors with labels, icons, patterns, or text.

Environmental classification must follow the methodology of the underlying
source.

---

# 10. Typography

Primary typeface:

Inter

Fallback:

system-ui, sans-serif

## Public Hero

40–48px

Weight:

650–700

Avoid oversized SaaS-style 70–90px headlines.

---

## Public Page Title

32–40px

Weight:

650

---

## Workspace Page Title

24–28px

Weight:

650

---

## Section Heading

22–24px

Weight:

600–650

---

## Card Heading

16–18px

Weight:

600

---

## Body

15–16px

Weight:

400

Line height:

1.55–1.65

---

## Metadata

13–14px

Use secondary or muted text.

---

## KPI Numbers

Primary:

28–36px

Compact:

22–28px

Weight:

600–700

Use tabular numerals:

`font-variant-numeric: tabular-nums;`

---

## Monospace

Monospace typography should only be used for:

- coordinates
- station identifiers
- dataset identifiers
- API examples
- code
- machine-readable values

Do not use monospace merely to make the interface appear technical.

---

# 11. Spacing

Use an 8px-oriented spacing system.

Allowed values:

`4px`
`8px`
`12px`
`16px`
`20px`
`24px`
`32px`
`40px`
`48px`
`64px`
`80px`
`96px`

Avoid arbitrary spacing values.

---

# 12. Layout Grid

Desktop:

12 columns

Tablet:

8 columns

Mobile:

4 columns

Standard public content width:

1280px

Maximum public content width:

1440px

Analytical workspace content may expand beyond 1440px when maps, tables, or
visualizations benefit from available screen width.

---

# 13. Public Density

Default card padding:

20–24px

Section spacing:

64–96px desktop

48–64px tablet

40–48px mobile

Public pages should feel breathable without creating excessive unused space.

---

# 14. Workspace Density

Workspace cards:

16–20px padding

Major workspace section spacing:

24–32px

Related control spacing:

8–16px

Workspace interfaces should use screen space efficiently.

Do not copy landing-page spacing into authenticated dashboards.

---

# 15. Border Radius

Small controls:

6–8px

Buttons:

8px

Cards:

12px

Large feature cards:

16px

Dialogs:

16px

Avoid excessive rounding.

Pills should mainly be reserved for:

- status
- tags
- filters
- categories

---

# 16. Borders & Elevation

Default card:

`1px solid semantic-border`

Default shadow:

`0 1px 3px rgba(0,0,0,0.05)`

Elevated overlays and map controls may use stronger shadows.

Hierarchy should primarily come from:

- surface
- spacing
- border
- typography

not heavy shadows.

Avoid floating-card-everywhere design.

---

# 17. Icons

Use ONE primary icon family.

Style:

- outline
- simple geometry
- 1.5–2px stroke

Do not mix unrelated icon libraries visually.

Avoid emoji as permanent interface icons.

Domain icon concepts may represent:

- weather
- water
- air
- climate
- biodiversity
- forest
- agriculture
- marine
- radiation
- emissions
- research
- reports

---

# 18. Buttons

## Primary

Use Delta Green.

Reserved for the primary action within a context.

Examples:

- Explore data
- Submit report
- Save
- Publish
- Create dataset

Avoid multiple competing primary buttons in the same component.

---

## Secondary

Neutral surface with visible border.

---

## Tertiary

Text or subtle ghost action.

---

## Destructive

Use semantic critical styling.

Never use brand green for destructive actions.

---

# 19. Cards

Supported card families:

- metric card
- environmental status card
- chart card
- map card
- dataset card
- location card
- research card
- researcher card
- facility card
- species card
- citizen report card
- alert card
- activity card

Do not create unique card geometry for each domain.

A typical card should contain:

Header
→ Primary content
→ Supporting context
→ Metadata
→ Optional action

Avoid nested cards unless hierarchy genuinely requires them.

Avoid decorative gradients and oversized icons.

---

# 20. KPI Cards

KPIs must answer meaningful questions.

Good:

Temperature
31.4 °C
+1.8° vs seasonal reference

Bad:

31.4

A KPI may include:

- label
- value
- unit
- comparison
- status
- update time

Do not convert every database count into a KPI.

Maximum primary KPI cards on a dashboard:

4–5

Additional counts belong in secondary summaries.

Zero-value KPIs should be visually de-emphasized unless zero represents an
important operational state.

---

# 21. Data Visualization

Charts must be analytical, not decorative.

Every chart should make clear:

- metric
- unit
- period
- geographic context
- source
- observation/forecast state where relevant

Preferred:

- line
- area
- bar
- stacked bar
- scatter
- histogram
- heatmap
- choropleth
- distribution

Avoid:

- 3D charts
- decorative gauges
- excessive donut charts
- rainbow palettes
- artificial smoothing
- unexplained dual axes
- unnecessary gradients

Grid lines should be subtle.

Tooltips should expose exact values and timestamps.

Observed and forecast values must be visually distinguishable.

---

# 22. Maps

Maps are first-class Delta Signal components.

They must follow a shared GIS design language.

## Basemap

Use a visually quiet basemap.

Environmental layers must remain visually dominant.

---

## Boundaries

Country:

strong

Division:

medium

District:

subtle

Upazila:

context/zoom dependent

---

## Controls

Group map controls logically.

Common controls:

- zoom
- current/selected location
- layers
- legend
- time
- fullscreen

Avoid scattering unrelated floating buttons around the map.

---

## Required Context

Thematic maps should provide where relevant:

- legend
- unit
- source
- update time
- coverage
- data status

---

## Interaction

Hover:

quick value

Click:

structured location summary

Detail action:

full location/data view

---

# 23. Environmental Alerts

Alerts must communicate severity without sensationalism.

Recommended structure:

Severity
→ Environmental condition
→ Location
→ Value
→ Comparison/reference
→ Observation/forecast status
→ Time
→ Source

Example:

WATCH

Elevated river discharge

Feni

1.4× historical reference

Forecast · Updated 10:30 BST

Source: Open-Meteo / GloFAS

Avoid dramatic wording unless it comes from an authoritative classification.

---

# 24. Data State & Uncertainty

Delta Signal must distinguish:

- Observed
- Forecast
- Estimated
- Modeled
- Citizen reported
- Verified
- Unverified
- Unknown

These states must not appear equivalent.

Citizen reports must not visually appear equivalent to authoritative
observations without appropriate labeling.

Forecasts must never appear to be historical observations.

---

# 25. Tables

Tables are first-class components.

Minimum row height:

44–52px

Headers should have subtle surface differentiation.

Use semantic row borders.

Alignment:

Text → left

Numbers → right

Status → consistent column alignment

Actions → right

Large tables should support where appropriate:

- pagination
- sorting
- filtering
- search
- column visibility
- sticky headers

Do not replace naturally tabular information with cards merely to make the page
look modern.

---

# 26. Filters

Filtering must behave consistently across modules.

Recommended hierarchy:

Search
→ Location
→ Primary domain filter
→ Time
→ Advanced filters
→ Sort

Location hierarchy:

Division
→ District
→ Upazila

Do not expose every filter at once.

Prefer:

Primary filters + More filters

Active filters should remain visible.

Each active filter must be individually removable.

Provide:

Clear all

Desktop:

horizontal filter bar or structured sidebar

Mobile:

filter drawer

---

# 27. Search

Search should support cross-domain environmental discovery.

Examples:

"Feni rainfall"

"Dhaka air quality"

"Sundarbans species"

"Jashore temperature"

Results should clearly identify resource type.

Examples:

LOCATION

DATASET

SPECIES

RESEARCH

RESEARCHER

FACILITY

REPORT

INDICATOR

WATER BODY

---

# 28. Source & Provenance

Use a consistent source component.

Example:

Source
Open-Meteo

Updated
26 Sep 2026 · 10:30 BST

Coverage
Bangladesh

Type
Forecast

Where applicable expose:

- methodology
- original dataset
- license
- download
- API/source link

Source attribution should be discoverable without overwhelming the main
visualization.

---

# 29. Public Landing Page

The landing page is NOT a dashboard.

Its purpose is to answer:

- What is happening?
- Where?
- Why does it matter?
- What can I explore?

Recommended hierarchy:

Hero

→ Current environmental snapshot

→ Bangladesh map / important signals

→ Environmental categories

→ Key conditions / indicators

→ Recent alerts

→ Research and datasets

→ Citizen participation

→ Platform sources / credibility

Avoid turning the homepage into a collection of admin-style KPI cards.

---

# 30. Public Navigation

Primary navigation should remain compact.

Recommended conceptual grouping:

Explore
Map
Data
Research
Reports

Additional items should be carefully justified.

Do not place every environmental domain directly in the top navigation.

Use Explore/Data for domain discovery.

---

# 31. Authenticated Application Shell

The workspace should use a persistent application shell.

Desktop:

Sidebar

- Top utility bar
- Main workspace

Recommended sidebar width:

240–264px

Collapsed sidebar:

64–72px

The main workspace should use remaining available width.

---

# 32. Workspace Sidebar

Do NOT present all modules as one flat navigation list.

Group navigation by user intent.

Example:

OVERVIEW

Dashboard

ENVIRONMENT

Observations
Alerts
Biodiversity
Water Bodies
Marine
Radiation
Emissions

DATA

Data Hub
Locations

COMMUNITY

Citizen Reports

ADMINISTRATION

Users
Organizations
Audit / System

Only show sections relevant to the user's role.

The profile/account area belongs at the bottom of the sidebar or in the top
utility bar.

---

# 33. Workspace Header

Workspace headers must be compact.

Typical structure:

Page title
Short context/description
Optional status
Primary page action

Top utility bar may contain:

- global search
- notifications
- help
- theme
- user menu

Do not use landing-page-sized titles in the workspace.

Do not create large decorative header areas.

---

# 34. Dashboard Philosophy

The authenticated dashboard is an environmental workspace, not a generic admin
statistics screen.

Its purpose is to answer:

1. What needs my attention?
2. What is happening environmentally?
3. What changed recently?
4. What data/activity is available?
5. What should I do next?

---

# 35. Dashboard Information Priority

## Priority 1 — Actionable

Examples:

- active environmental alerts
- pending moderation
- failed ingestion
- stale datasets
- data-quality problems
- important system conditions

---

## Priority 2 — Environmental

Examples:

- observations
- biodiversity
- water
- weather
- air
- emissions
- citizen reports
- geographic activity

---

## Priority 3 — Platform

Examples:

- datasets
- organizations
- users
- audit events

Platform statistics should not dominate the environmental dashboard.

---

# 36. Dashboard KPI Rules

Maximum:

4–5 primary KPIs.

Do not create a large card for every count.

Good primary KPI:

Active Alerts
4
2 require attention

Good:

Observations
1,284
+42 this week

Potential secondary metric:

Organizations
10

Poor primary KPI:

Audit events today
1

Administrative statistics belong in compact secondary sections unless directly
relevant to the current user's role.

---

# 37. Dashboard Layout

Recommended desktop hierarchy:

Header

→ Primary KPIs

→ Main environmental/map visualization + Attention panel

→ Activity / trends / coverage

→ Secondary platform statistics

Example:

| KPIs KPIs KPIs KPIs |

| Environmental Map 8 cols | Attention 4 cols |

| Recent Activity 7 cols | Data Coverage 5 cols |

| Role-specific secondary information |

Avoid arbitrary incomplete grids.

---

# 38. Dashboard Empty States

Never dedicate a large analytical panel to:

"No data."

or:

"No active alerts."

If no data exists:

- collapse the component where appropriate
- reduce its height
- explain the state
- offer an action
- or replace it with useful information

Good:

✓ No active alerts
Bangladesh environmental feeds currently show no active platform alerts.
Last checked 10:30 BST.

Bad:

300px empty card
"No active alerts."

Empty states should preserve usefulness.

---

# 39. Dashboard Healthy States

A healthy/zero state may itself be useful.

Examples:

✓ No active alerts

✓ No datasets require review

✓ All scheduled data sources updated successfully

Healthy states should be compact and reassuring.

Do not turn them into giant green success banners.

---

# 40. Dashboard Activity

Authenticated dashboards should surface recent meaningful activity where
appropriate.

Examples:

- dataset published
- report submitted
- report verified
- observation imported
- research added
- organization updated
- environmental alert created/resolved

Activity should use:

icon
→ action
→ object
→ actor/source when useful
→ relative time

---

# 41. Data Coverage

Where useful, show platform coverage rather than meaningless raw counts.

Examples:

District coverage
58 / 64

Weather coverage
64 districts

Species records
1,175

Water bodies mapped
XXX

Datasets updated in last 24h
X / Y

Coverage often communicates platform value better than generic entity counts.

---

# 42. Workspace Tables & Management Pages

Management pages should prioritize:

Title / context
→ primary action
→ search/filter
→ results summary
→ table/list
→ pagination

Avoid adding KPI cards above every management table.

Only show summary metrics when they improve decisions.

---

# 43. Workspace Forms

Labels must remain visible.

Do not rely exclusively on placeholders.

Input height:

40–44px desktop

44–48px touch contexts

Validation should appear next to the relevant field.

Long forms should be divided into meaningful sections.

Use sticky actions only when they materially improve long-form editing.

---

# 44. Loading States

Prefer skeletons matching final content.

Maps:

map-specific loading state

Charts:

preserve dimensions while loading

Tables:

row skeletons

Cards:

content skeletons

Avoid full-page spinners when individual sections can load independently.

---

# 45. Empty States

Empty states should explain:

- what is missing
- why it may be missing
- what the user can do

Bad:

No data.

Better:

No observations are available for Feni during the selected period.

Possible actions:

Change period
Change location
Clear filters

---

# 46. Error States

Errors should be actionable.

Include where appropriate:

- what failed
- whether existing data remains usable
- retry
- alternative action
- technical details only when useful to the audience

Do not expose raw backend errors to ordinary users.

---

# 47. Responsive Design

Desktop:

12-column analytical layout

Tablet:

8-column layout

Mobile:

4-column layout

Do not simply stack the desktop interface vertically.

---

# 48. Mobile Public Experience

Prioritize:

- current condition
- location
- primary environmental signal
- map
- key categories
- alerts

Cards may become horizontally scrollable only where this improves usability.

---

# 49. Mobile Workspace

Sidebar becomes:

drawer / compact navigation

Filters become:

drawer or bottom sheet where appropriate

Tables may use:

controlled horizontal scrolling
or
responsive row patterns

Maps must retain meaningful height.

Charts must not become unreadably compressed.

Primary actions must remain easy to reach.

---

# 50. Accessibility

Target:

WCAG 2.2 AA

Body-text contrast:

minimum 4.5:1

Controls must have visible focus states.

Touch targets should be approximately:

44 × 44px

where practical.

Severity must never depend solely on:

red vs green.

Charts should provide textual summaries where practical.

Map information should have non-map alternatives where important.

---

# 51. Motion

Motion communicates state.

Typical duration:

120–220ms

Allowed:

- hover transitions
- drawers
- dialogs
- map transitions
- chart updates
- expanding filters
- state changes

Avoid:

- bouncing elements
- animated gradients
- excessive parallax
- continuous pulsing
- unnecessary animated counters
- decorative motion

---

# 52. Imagery

Environmental photography may be used on:

- landing page
- editorial/research content
- species content
- citizen reports
- environmental stories

Avoid large decorative photography inside analytical workspace screens.

Maps and data visualizations should replace photography when data is the primary
subject.

---

# 53. Content Tone

Interface language should be:

- concise
- factual
- calm
- understandable
- scientifically responsible

Avoid:

- sensational environmental language
- unnecessary jargon
- marketing superlatives
- ambiguous severity descriptions

Technical terminology is acceptable when the target audience requires it.

---

# 54. Do

- Make environmental data the visual focus.
- Preserve geographic context.
- Show units consistently.
- Show sources.
- Show timestamps.
- Distinguish observations from forecasts.
- Distinguish verified from citizen-reported information.
- Use maps when geography matters.
- Maintain consistent filters.
- Keep public pages approachable.
- Keep workspace pages efficient.
- Use whitespace intentionally.
- Prioritize actionable dashboard information.
- Group workspace navigation.
- Design useful empty states.
- Reuse shared components.
- Optimize for both citizens and expert users through progressive disclosure.

---

# 55. Don't

- Don't make Delta Signal look like a generic admin template.
- Don't create separate visual identities for public and workspace pages.
- Don't make every database count a KPI.
- Don't fill dashboards with empty cards.
- Don't use neon dashboard aesthetics.
- Don't use excessive gradients.
- Don't use excessive shadows.
- Don't over-round every component.
- Don't use red decoratively.
- Don't use green to imply environmental health without evidence.
- Don't hide provenance.
- Don't mix icon styles.
- Don't invent environmental severity.
- Don't present forecasts as observations.
- Don't present citizen reports as verified measurements.
- Don't use charts when text or a number communicates the information better.
- Don't expose all filters simultaneously.
- Don't make the sidebar one long unstructured list.
- Don't use huge public-style headings inside the workspace.
- Don't use decorative imagery inside operational dashboards.
- Don't sacrifice clarity for visual novelty.

---

# 56. AI / Code Generation Rules

Any AI coding agent modifying the Delta Signal frontend MUST treat this document
as the canonical visual specification.

Before creating a new component:

1. Search for an existing equivalent.
2. Reuse or extend the existing component when appropriate.
3. Use design tokens rather than page-specific values.
4. Determine whether the page belongs to PUBLIC, WORKSPACE, or AUTH.
5. Apply the corresponding density/layout rules.
6. Follow shared Data/GIS rules for maps and charts.
7. Preserve accessibility.
8. Preserve responsive behavior.

AI agents must NOT:

- redesign individual pages independently
- introduce arbitrary colors
- introduce arbitrary spacing
- introduce new card styles without justification
- introduce another icon language
- hard-code environmental status colors
- create duplicate components because existing ones look slightly different
- replace information architecture merely for visual novelty

When an existing page conflicts with this document, prefer refactoring toward
this design system rather than preserving inconsistent legacy styling.

---

# 57. Refactoring Existing Delta Signal UI

Existing pages should be migrated incrementally.

For each page:

1. Classify:
   PUBLIC / WORKSPACE / AUTH

2. Inventory:
   - layout
   - components
   - typography
   - colors
   - spacing
   - filters
   - tables
   - charts
   - maps
   - empty states
   - responsive behavior

3. Identify violations of DESIGN.md.

4. Identify reusable existing components.

5. Replace hard-coded styles with shared tokens.

6. Correct information hierarchy before cosmetic styling.

7. Refactor responsive behavior.

8. Verify accessibility.

9. Verify loading, empty, error, and populated states.

10. Compare the page against adjacent Delta Signal pages for consistency.

Do not perform a superficial "make it prettier" pass.

The objective is a coherent product system.

---

# 58. Final Design Test

Before considering any Delta Signal page complete, ask:

### Identity

Does this unmistakably belong to Delta Signal?

### Hierarchy

Can the user immediately identify the most important information?

### Environment

Is environmental information more prominent than UI decoration?

### Geography

Is geographic context visible where relevant?

### Evidence

Can the user understand where the information came from?

### State

Can the user distinguish observed, forecast, estimated, and citizen-reported
information?

### Action

If action is required, is it obvious?

### Density

Is this page appropriately spacious for PUBLIC or appropriately efficient for
WORKSPACE?

### Consistency

Does it use established Delta Signal components?

### Empty State

Does the page remain useful when data is absent?

### Responsive

Does the experience remain intentional on tablet and mobile?

### Accessibility

Can the interface be understood without relying only on color?

If several answers are "no", the page is not finished.

# Delta Signal — DESIGN.md

> Canonical design specification for `apps/web`.
>
> **Version 2.1 · October 2026.** See §61 for what changed.
>
> This document applies to the public and authenticated experiences in `apps/web`:
>
> - Public website
> - Public environmental data pages
> - Maps and GIS views
> - Research and dataset pages
> - Authentication
> - Authenticated workspace
> - User dashboards
> - Data contribution and moderation workflows in `apps/web`
>
> The separate `apps/admin` console follows its own design system. Within
> `apps/web`, public and authenticated experiences may have different density
> and layout, but must use the same foundations, components, environmental
> semantics, and data-visualization language.
>
> Section numbers are stable. New sections added in v2 use letter suffixes
> (e.g. §9A) so existing references stay valid.

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

## 1.1 Language

The interface language is **English only**.

- All UI copy, labels, place names, and content are in English.
- Do not add language switchers, Bengali place-name labels, or Bengali fonts.
- If localization is introduced later, it requires a new section in this
  document (typeface, line height, and layout rules for Bengali script) before
  implementation.

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

## 2.7 One Number, One Definition

The same metric must show the same value everywhere it appears.

Every count shown in the UI (species, records, districts, reports, users) must
come from a single shared definition. See §41A.

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

Public pages must render their primary content on the server so search engines
and link previews can read it. Client-side rendering is acceptable only for
interactive enhancements.

Every public page's server HTML must include:

- the top navigation
- exactly one `<h1>`
- a page-specific `<title>` and meta description
- all primary sections, in the same order they appear visually

## 3.4 Markup Order and Responsive Structure

- The HTML source order must match the visual reading order. Do not reorder
  sections with CSS `order`, grid placement, or absolute positioning.
- Build one responsive component per section. Do not render separate desktop
  and mobile copies of the same content and hide one with CSS: hidden copies
  are still read by search engines and can be read twice by assistive
  technology.
- Each statement appears once per page (e.g. the "not a government service"
  line belongs in one place, plus the footer).

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

Workspace routes (including `/dashboard`) require sign-in. Signed-out visitors
are redirected to sign-in and returned to the requested page afterwards.
Public browsing belongs in the Public Experience, not the workspace.

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

Desktop split layout:

- Brand panel (5 columns): Deep Delta surface, logo, one-sentence value
  statement, up to three account benefits, independence/source line.
- Form panel (7 columns): back link to the site, theme control, form centered
  at about 400px wide, footer links (Privacy, Terms, Help).

Mobile: compact header with logo and theme control, then the form. No brand
panel.

Form rules:

- One primary button (e.g. "Sign in"); all other actions are links.
- Visible labels above every field (§43).
- Field errors appear directly below the field, with an icon and text.
- Account-level errors (e.g. wrong credentials) appear above the form in an
  alert region and must not reveal whether the email exists.
- Password fields have a show/hide control with an accessible label.
- "Forgot password?" sits next to the password label.
- Only show third-party sign-in options that are actually enabled.

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

All foundation values are implemented as design tokens (CSS custom
properties). See §59.

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

## 5.1 Theme Behavior

- On first visit, follow the operating system setting
  (`prefers-color-scheme`).
- Once the user chooses a theme, remember the choice and use it on every page.
- Apply the theme before first paint to avoid a light-to-dark flash.
- Theme switching swaps token values only. Components never contain
  theme-specific hard-coded colors.

## 5.2 Theme Control

- Public pages: an icon button (moon in light mode, sun in dark mode) in the
  top navigation, with an accessible label such as "Switch to dark theme".
- Workspace: inside the user menu in the top utility bar. Do not use a
  full-width sidebar button.
- Authentication: icon button in the form panel header.
- Never display the theme as plain text (e.g. "Theme: Dark").

## 5.3 What Does Not Change Between Themes

- Data color ramps on maps and charts (§21A). A value must look the same in
  both themes.
- Text placed on top of data-colored areas uses fixed on-ramp text colors, not
  theme text tokens.
- The site footer may remain dark in both themes.

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

Muted:

`#87948F`

Border:

`#DDE5E1`

Strong Border:

`#CBD7D1`

**Muted is not a text color.** `#87948F` has about 3:1 contrast on the light
background and fails WCAG AA for text. Use it only for disabled controls,
decorative dividers, dotted badge borders, and non-essential icons.
Metadata, captions, and timestamps use Secondary Text.

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

Muted:

`#78857F`

Border:

`#2D3833`

Strong Border:

`#3B4942`

Muted follows the same rule as light mode: not for readable text.

---

# 8. Brand Palette

The palette should evolve from the existing Delta Signal visual identity rather
than replacing it.

## Delta Green

`#178A63`

Primary brand color.

Use for:

- logo mark
- active navigation indicators
- selected controls
- focus rings
- brand emphasis

White text on `#178A63` is about 4.3:1, below AA for normal text. Do not use it
as a fill behind text or as text on light surfaces. Use Delta Green 600.

---

## Delta Green 600

`#147A57`

Use for:

- filled primary buttons (white text, about 5.3:1)
- link text on light surfaces
- active navigation backgrounds with white text

---

## Delta Green Light (dark mode)

`#4FBF8F`

Use in dark mode for:

- link text
- logo mark
- accent text and icons
- focus rings

Filled primary buttons keep Delta Green 600 in both themes.

---

## Deep Delta

`#0D5F4A`

Use for:

- strong emphasis
- dark brand surfaces (e.g. authentication brand panel)
- selected states
- eyebrow labels and accent text on light surfaces
- link hover on light surfaces

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

## 8.1 Domain Icon Tints

Topic and category icons sit in a 40px tinted square. Each domain has a tint
background and an icon color per theme:

| Domain | Light bg | Light icon | Dark bg | Dark icon |
|---|---|---|---|---|
| Weather / Sky | `#E8F3FB` | `#2A7DB8` | `#1B2F3E` | `#8CC4EC` |
| Water | `#E6F0F8` | `#1F6AA3` | `#1A2C3B` | `#7DB7E3` |
| Biodiversity / Forest | `#E9F2EA` | `#3F7447` | `#1F2F22` | `#8CC495` |
| Earth / Agriculture / Emissions | `#F4ECE3` | `#7D5A35` | `#33291E` | `#D1A77A` |
| Heat | `#FCEEE2` | `#9A5A1E` | `#3A2A1E` | `#F0B488` |
| Neutral (air, other) | `#EEF1F0` | `#4D5C56` | `#232C28` | `#AAB7B1` |

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

## 9.1 Semantic Fill vs Semantic Text

The values above are for **fills, dots, swatches, and borders**. Several fail
contrast as text (Watch yellow is about 2.3:1 on white). For badges and status
text, use tinted backgrounds with dedicated text colors:

| State | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| Normal | `#E4F3EA` | `#1F6B45` | `#1A2E23` | `#5CC98F` |
| Watch | `#FBF1D6` | `#6E5109` | `#352D14` | `#E9C766` |
| Warning | `#FCE8D5` | `#8A4510` | `#3A2A1A` | `#F2B27A` |
| Critical | `#FBE3E3` | `#B23A3A` | `#3A1E1E` | `#F08A8A` |

Status badges also use a shape cue so meaning never depends on color alone
(e.g. round dot for Normal/Watch, square for Warning and above).

---

# 9A. Domain Classification Scales

Each environmental domain uses the official categories of its source
methodology. Do not invent categories or force every domain into the five
semantic levels.

## Air quality (PM2.5)

Use the US EPA PM2.5 breakpoints (2024 revision), in µg/m³, 24-hour basis:

| Category | Range | Semantic mapping |
|---|---|---|
| Good | 0.0–9.0 | Normal |
| Moderate | 9.1–35.4 | Watch |
| Unhealthy for sensitive groups | 35.5–55.4 | Warning |
| Unhealthy | 55.5–125.4 | Critical |
| Very unhealthy | 125.5–225.4 | Critical (darker, `#8E3B8A`) |
| Hazardous | 225.5+ | Critical (darkest, `#6B1F2A`) |

Rules:

- Always name the pollutant ("PM2.5"), the unit, and whether values are
  observed or modeled.
- Classify on the same value that is displayed. If values are rounded for
  display, classify the rounded value, or display one decimal.
- If Delta Signal later adopts the Bangladesh Department of Environment AQI,
  replace this table rather than mixing scales.

## UV index

Use WHO categories: Low 0–2, Moderate 3–5, High 6–7, Very high 8–10,
Extreme 11+.

## River discharge

Expressed as a ratio to a historical reference (e.g. 1.4×).

- The reference (e.g. median, or a return-period threshold) must be named in
  methodology.
- Watch / Warning / Critical thresholds: **[to define — e.g. ≥ 1.5× / 2-year
  return period / 5-year return period]**.
- A ratio at or near 1.0× is normal and is never shown as an alert.

## Temperature

Show absolute values with units. Heat categories may be added only when a
recognized heat-index methodology is adopted.

---

# 10. Typography

Primary typeface:

Inter

Fallback:

system-ui, sans-serif

Load only the weights used (400, 500, 600, 700). No other typefaces.

## Public Hero

40–48px desktop, 28–32px mobile

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

Use Secondary Text (not Muted, see §6).

---

## Navigation

Sidebar items: 14–15px, weight 500.

Sidebar group labels: 12px, weight 600, uppercase, letter-spacing 0.06em,
Secondary Text.

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

# 10A. Numbers, Units, Dates, and Times

## Time zone

- Store all timestamps in UTC.
- Display in Bangladesh time (`Asia/Dhaka`, UTC+6).
- Label as **"BST (UTC+6)"** on first use in a view and in source components.
  "BST" alone is ambiguous (British Summer Time).

## Date and time format

| Use | Format | Example |
|---|---|---|
| Date | D Mon YYYY | 30 Sep 2026 |
| Date in current year (compact) | D Mon | 30 Sep |
| Time | 24-hour HH:MM | 16:00 |
| Date and time | D Mon YYYY, HH:MM | 30 Sep 2026, 16:00 |
| Recent (under 24 hours) | relative | 16 min ago |

- Relative times always have the absolute time available (tooltip or
  adjacent text).
- Never display raw ISO strings (e.g. `2026-10-29T00:00:00.000Z`).
- Forecast times say what they refer to: "Forecast for 29 Oct", not
  "Forecast date".

## Snapshot semantics

A "Right now" or snapshot value must match its label:

- "Hottest" and "Coolest" use today's maximum and minimum so far, not a single
  hourly reading (a midnight reading is not "hottest").
- If a single reading is shown, label it with its time (e.g. "Warmest at
  00:00").

## Counts and plurals

Use correct singular and plural forms: "1 district", "10 districts". Use
plural-aware formatting for every count.

## Numbers and units

- Thousands separators: 4,503.
- A space between value and unit: 33.6 °C, 298 mm, 35 µg/m³.
- Ratios: 1.4× (no space).
- Use consistent decimals per metric: temperature 1, UV 1, rainfall 0,
  PM2.5 0 or 1 (see §9A).
- Periods are explicit: "30-day total", "30-day mean", "daily max". Never
  just "30-day".

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

Do not use background gradients on pages, headers, or cards.

---

# 17. Icons

Use ONE primary icon family: **[icon library — confirm, see §60]**.

Style:

- outline
- simple geometry
- 1.5–2px stroke

Do not mix unrelated icon libraries visually.

**Never use emoji as interface icons** (e.g. 🌊 ⛈ 🔬 🌱).

Icon sizes: 16px inline, 20px default, 24px emphasis.

Decorative icons are hidden from assistive technology (`aria-hidden="true"`).
Icon-only buttons require an accessible label.

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

Fill with Delta Green 600 (`#147A57`), white text.

Reserved for the primary action within a context.

Examples:

- Explore data
- Submit report
- Save
- Publish
- Create dataset
- Sign in

Avoid multiple competing primary buttons in the same component.

---

## Secondary

Neutral surface with visible strong border.

---

## Tertiary

Text or subtle ghost action.

---

## Destructive

Use semantic critical styling.

Never use brand green for destructive actions.

---

## Sizes

40px default, 44px compact touch, 48px prominent (hero, auth, mobile primary).

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

**On public pages, do not show counters that are zero.** Hide them until they
are meaningful, or replace them with an invitation (e.g. "Be the first to
report in your district").

A KPI value must never contradict other content on the same page (e.g.
"0 districts covered" next to district-level data).

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

Observed and forecast values must be visually distinguishable (e.g. solid
line for observed, dashed for forecast).

Do not chart very small datasets (e.g. 3 users by role). Use numbers or a
short list.

---

# 21A. Data Color Ramps

Ramps are identical in light and dark themes (§5.3). Use 3–5 classed bins with
a visible legend showing bin ranges and unit.

## Sequential — water and rainfall

| Bin | Fill | Text on fill |
|---|---|---|
| 1 (lowest) | `#E3EFF8` | `#16201C` |
| 2 | `#B5D4EC` | `#16201C` |
| 3 | `#1F6AA3` | `#FFFFFF` |
| 4 (highest) | `#154A74` | `#FFFFFF` |

## Sequential — temperature

| Bin | Fill | Text on fill |
|---|---|---|
| 1 | `#F7E6D4` | `#16201C` |
| 2 | `#EFC9A0` | `#16201C` |
| 3 | `#D99A5B` | `#16201C` |

## Sequential — UV and other atmospheric indices

| Bin | Fill | Text on fill |
|---|---|---|
| 1 | `#ECE8F4` | `#16201C` |
| 2 | `#CFC5E6` | `#16201C` |
| 3 | `#9F8CCB` | `#16201C` |

## Diverging — anomalies (vs reference)

**[to define — blue-to-neutral-to-orange, colorblind-safe, centered on 0]**

Rules:

- **Bin edges are fixed per metric**, documented in methodology, and do not
  change with each day's data. A color must mean the same value on every day.
  Do not compute bins from quantiles of the current data.
- Bin labels must not overlap: use "< 225", "225–249", "250–299", "≥ 300",
  not "187–220" followed by "220–252".
- Ramps must remain distinguishable for common color-vision deficiencies.
- When the data range is narrow, say so in the legend caption (e.g. "Narrow
  range: 28.5–29.1 °C").
- Text on data-colored areas uses the "Text on fill" color, which meets
  4.5:1.
- Classified categories (AQ, UV) use their §9A scale colors, not these ramps.

---

# 22. Maps

Maps are first-class Delta Signal components.

They must follow a shared GIS design language.

## Basemap

Use a visually quiet basemap: light gray in light theme, dark gray in dark
theme. Environmental layers must remain visually dominant.

**Map library: [confirm, see §60].**

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

Layer switching uses a segmented control or layer panel, with
`aria-pressed` on the active option.

---

## Required Context

Thematic maps should provide where relevant:

- legend
- unit
- period
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

## Simplified Maps

On summary surfaces (landing page, dashboard cards) a division tile map is
acceptable when a full map is too heavy. It must be labeled as approximate and
not to scale, and link to the full map.

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

Forecast for 2 Oct · Updated 10:30 BST (UTC+6)

Source: Open-Meteo / GloFAS

Rules:

- An alert is shown only when a value meets the Watch threshold or above in
  its §9A scale. Values at the reference level are not alerts.
- The trigger threshold must be discoverable (e.g. "Shown when ≥ 1.5×
  reference") in the alert detail or methodology.
- Avoid dramatic wording unless it comes from an authoritative
  classification.
- Site-wide banners are reserved for Warning or Critical.

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

Data-state badges use a text label plus a border style:

| State | Badge border |
|---|---|
| Observed | solid |
| Forecast | dashed |
| Modeled / Estimated | dotted |
| Citizen reported | solid, with "Citizen" label |
| Verified | solid, with check icon |
| Unverified / Unknown | dotted, Secondary Text |

Citizen reports must not visually appear equivalent to authoritative
observations without appropriate labeling.

Forecasts must never appear to be historical observations.

Data quality labels (e.g. "research-grade") must match the actual filter
applied to the data.

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

Use real `<table>` markup with `scope` on header cells.

Column headers must describe the values in the column. Dataset tables use:
Dataset · Category · Data type (Observed / Forecast / Modeled / Estimated,
per §24) · Access · Actions.

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

Search inputs have a visible label or an accessible name.

---

# 28. Source & Provenance

Use a consistent source component.

Example:

Source
Open-Meteo

Updated
26 Sep 2026 · 10:30 BST (UTC+6)

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

## 28.1 Canonical Source Names

Each source has one display name used everywhere (source components, dataset
names, footers, methodology):

| Source | Display name |
|---|---|
| Open-Meteo weather, climate, marine | Open-Meteo |
| GloFAS river discharge (via Open-Meteo) | GloFAS · Copernicus |
| GBIF occurrences | GBIF |
| World Bank indicators | World Bank |
| Air quality model | [confirm — e.g. CAMS via Open-Meteo] |

Never ship a placeholder source. If the source is unknown, the data is not
published.

# 28A. Place and Taxon Names

## Place names

Use the official English spellings adopted by the Government of Bangladesh in
2018, consistently across UI, data, and URLs:

- Chattogram (not Chittagong / Chattagram)
- Barishal (not Barisal)
- Cumilla (not Comilla)
- Jashore (not Jessore)
- Bogura (not Bogra)

Maintain one canonical place-name table (division, district, upazila) and
derive all labels from it.

## Taxon names

- Show the common English name when available, with the scientific name in
  italics beneath or beside it.
- If no common name exists, show the scientific name in italics as the main
  label.
- Ranks above species (family, order) carry a rank badge (e.g. "Family").

---

# 29. Public Landing Page

The landing page is NOT a dashboard.

Its purpose is to answer:

- What is happening?
- Where?
- Why does it matter?
- What can I explore?

Recommended hierarchy:

Hero (headline, short description, primary + secondary action, search)

→ Current environmental snapshot ("Right now" card with timestamps and a
compact alert status)

→ Bangladesh map / important signals (map or division tile map with layer
switch, plus a division table)

→ Key conditions / indicators (e.g. air quality, biodiversity)

→ Environmental categories ("Explore by topic")

→ Research and datasets

→ Citizen participation

→ Platform sources / credibility

Rules:

- No zero counters (§20).
- No site-wide alert banner unless an alert at Warning or above exists (§23).
- Avoid turning the homepage into a collection of admin-style KPI cards.

---

# 30. Public Navigation

Primary navigation should remain compact.

Recommended conceptual grouping:

Explore
Map
Data
Research
Reports

Right side: search, theme control, Sign in (secondary button).

Additional items should be carefully justified.

Do not place every environmental domain directly in the top navigation.

Use Explore/Data for domain discovery.

The logo links to the home page.

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

The sidebar spans the full viewport height and scrolls independently if its
content is taller than the screen.

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
Industry

DATA

Data Hub
Locations

COMMUNITY

Citizen Reports
Restoration
Organizations
Members

ADMINISTRATION (admin only)

Users
Data sources
Audit log

Only show sections relevant to the user's role.

Active item: Delta Green 600 background with white text, or a Delta Green
left indicator on a Secondary Surface background. Use one style
consistently.

The profile/account area belongs in the top utility bar user menu. The
sidebar footer may show a compact collapse control only.

---

# 33. Workspace Header

Workspace headers must be compact.

Typical structure:

Page title
Short context/description
Optional status
Primary page action

Top utility bar contains:

- global search
- notifications
- help
- user menu (account, settings, theme, sign out)

Do not use landing-page-sized titles in the workspace.

Do not create large decorative header areas, eyebrow labels such as
"WORKSPACE", or background gradients.

Descriptions must be accurate: do not call data "real-time" unless it is.

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

# 34A. Role-Based Dashboard Home

All roles share the same shell and components. The dashboard content changes
by role:

| Role | Primary purpose | Shown first |
|---|---|---|
| Admin | Keep the platform healthy | Data source health, moderation queue, active alerts, stale datasets |
| Citizen | Report and follow their area | Followed districts' conditions, my reports and review status, Submit report action |
| Researcher | Get data | Saved datasets, access requests, recent downloads, new datasets |
| Organization | Run projects | Our projects and milestones, team activity |

New users see a short first-run checklist (e.g. "Follow your district",
"Submit your first report") that disappears once completed or dismissed.

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

## 35.1 Data Source Health (required data)

The admin dashboard depends on recorded ingestion runs. Every scheduled fetch
(Open-Meteo, GloFAS, GBIF, World Bank, and others) must record:

- source
- start and finish time
- status (success / partial / failed)
- rows fetched
- error summary

This enables states such as "8 of 9 sources updated · GloFAS failed at
14:00 · Retry".

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

Good (admin):

Data sources healthy
8 / 9
GloFAS failed 14:00

Potential secondary metric:

Organizations
10

Poor primary KPI:

Audit events today
1

Poor primary KPI:

Total users
3

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

The Attention panel lists items that need action, each with a direct action
(Retry, Review, View). When nothing needs attention it shows a compact healthy
state (§39).

Avoid arbitrary incomplete grids.

---

# 38. Empty States in Summaries

This applies to dashboards **and** public summary pages.

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
Last checked 10:30 BST (UTC+6).

Bad:

300px empty card
"No active alerts."

Empty states should preserve usefulness.

---

# 39. Healthy States

A healthy/zero state may itself be useful.

Examples:

✓ No active alerts

✓ No datasets require review

✓ All scheduled data sources updated successfully

Healthy states should be compact and reassuring: one or two lines, with a
check icon and a "last checked" time.

Do not turn them into giant green success banners.

Use a single shared component for healthy and empty states.

---

# 40. Dashboard Activity

Authenticated dashboards should surface recent meaningful activity where
appropriate.

Examples:

- dataset published
- report submitted
- report verified
- observation imported
- data source failed / recovered
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

# 41A. Metric Definitions

Every metric displayed anywhere in `apps/web` is defined once and reused.

For each metric, document:

- name (e.g. "Taxa recorded")
- exact definition (e.g. distinct accepted taxon keys of any rank, from GBIF
  occurrences within Bangladesh)
- filters applied (e.g. research-grade only, or all)
- source and refresh schedule

Rules:

- UI labels must match the definition ("taxa" if higher ranks are included,
  "species" only if limited to species rank).
- Public pages and dashboards call the same function or endpoint for the same
  metric.
- A discrepancy between two surfaces is a bug.

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

Invalid fields set `aria-invalid="true"` and reference their error text with
`aria-describedby`.

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

Primary actions on mobile are full width, 48px tall.

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

minimum 4.5:1 (including metadata and captions)

Large text (24px+, or 18.66px+ bold) and UI components:

minimum 3:1

Controls must have visible focus states (2px Delta Green outline with offset,
or a 3px focus ring on inputs).

Touch targets should be approximately:

44 × 44px

where practical.

Severity must never depend solely on:

red vs green.

Charts should provide textual summaries where practical.

Map information should have non-map alternatives where important (e.g. a
table beside the map).

Content order for keyboard and screen-reader users follows the HTML source
order, which must match the visual order (§3.4).

Every new color pairing must be contrast-checked before use.

Every link must lead to a page about its label. Temporary destinations (e.g.
a topic card linking to the general map) must be tracked and replaced.

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

Respect `prefers-reduced-motion`.

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
- overstated freshness ("real-time", "live") unless literally true

Technical terminology is acceptable when the target audience requires it.

Each page has a specific `<title>` (e.g. "Dashboard — Delta Signal").

---

# 54. Do

- Make environmental data the visual focus.
- Preserve geographic context.
- Show units consistently.
- Show sources.
- Show timestamps in BST (UTC+6).
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
- Use design tokens for every color and spacing value.
- Define each metric once.
- Optimize for both citizens and expert users through progressive disclosure.

---

# 55. Don't

- Don't make Delta Signal look like a generic admin template.
- Don't create separate visual identities for public and workspace pages.
- Don't make every database count a KPI.
- Don't show zero counters on public pages.
- Don't fill dashboards with empty cards.
- Don't use neon dashboard aesthetics.
- Don't use gradients.
- Don't use excessive shadows.
- Don't over-round every component.
- Don't use red decoratively.
- Don't use green to imply environmental health without evidence.
- Don't hide provenance.
- Don't mix icon styles.
- Don't use emoji as icons.
- Don't invent environmental severity.
- Don't show an alert for values at the reference level.
- Don't present forecasts as observations.
- Don't present citizen reports as verified measurements.
- Don't use charts when text or a number communicates the information better.
- Don't expose all filters simultaneously.
- Don't make the sidebar one long unstructured list.
- Don't use huge public-style headings inside the workspace.
- Don't use decorative imagery inside operational dashboards.
- Don't use Muted color for readable text.
- Don't display raw ISO timestamps.
- Don't add languages other than English.
- Don't reorder sections visually with CSS.
- Don't render duplicate desktop and mobile copies of content.
- Don't compute map legend bins from each day's data.
- Don't ship placeholder sources or inconsistent place names.
- Don't sacrifice clarity for visual novelty.

---

# 56. AI / Code Generation Rules

Any AI coding agent modifying the Delta Signal frontend MUST treat this document
as the canonical visual specification.

Before creating a new component:

1. Search for an existing equivalent.
2. Reuse or extend the existing component when appropriate.
3. Use design tokens (§59) rather than page-specific values.
4. Determine whether the page belongs to PUBLIC, WORKSPACE, or AUTH.
5. Apply the corresponding density/layout rules.
6. Follow shared Data/GIS rules for maps and charts.
7. Use the libraries named in §60.
8. Preserve accessibility.
9. Preserve responsive behavior.
10. Verify both light and dark themes.

AI agents must NOT:

- redesign individual pages independently
- introduce arbitrary colors
- introduce arbitrary spacing
- introduce new card styles without justification
- introduce another icon language
- hard-code environmental status colors
- hard-code hex values in components (use tokens)
- create duplicate components because existing ones look slightly different
- create new metric queries when a shared definition exists (§41A)
- replace information architecture merely for visual novelty

When an existing page conflicts with this document, prefer refactoring toward
this design system rather than preserving inconsistent legacy styling.

Credentials, API keys, and admin passwords never appear in code, prompts, or
commits. Use environment variables and seeded local accounts.

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

10. Verify light and dark themes.

11. Compare the page against adjacent Delta Signal pages for consistency.

Do not perform a superficial "make it prettier" pass.

The objective is a coherent product system.

## 57.1 Current Refactor Priorities

0. Landing page: server-render nav, h1, and meta description; one responsive
   component per section in visual order; remove duplicate markup (§3.1,
   §3.4).
1. Make `/dashboard` and other workspace routes sign-in only (§3.2).
2. Rebuild the workspace shell: grouped sidebar, top utility bar (§31–33).
3. Record data source ingestion runs (§35.1).
4. Redesign the admin dashboard (§34A, §36–37).
5. Shared empty/healthy state component (§38–39).
6. Unify metric definitions (§41A).
7. Citizen and researcher dashboard homes (§34A).
8. Standardize management pages (§42).
9. Notifications.
10. Mobile workspace (§49).

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

Does it use established Delta Signal components and tokens?

### Numbers

Does every number match the same metric shown elsewhere, with correct
plurals and labels?

### Structure

Does the HTML contain the nav, one h1, and all sections in visual order, with
no duplicated content?

### Empty State

Does the page remain useful when data is absent?

### Theme

Does the page work in both light and dark themes?

### Responsive

Does the experience remain intentional on tablet and mobile?

### Accessibility

Can the interface be understood without relying only on color, and does all
text meet contrast requirements?

If several answers are "no", the page is not finished.

---

# 59. Design Tokens

Implement foundation values as CSS custom properties on `:root`, with dark
values under `[data-theme="dark"]`. Components reference tokens only.

| Token | Light | Dark |
|---|---|---|
| `--ds-bg` | `#F7F9F8` | `#101513` |
| `--ds-surface` | `#FFFFFF` | `#171D1A` |
| `--ds-surface-2` | `#F1F5F3` | `#1D2521` |
| `--ds-surface-elevated` | `#FFFFFF` | `#222B27` |
| `--ds-text` | `#17201D` | `#F4F7F5` |
| `--ds-text-2` | `#5F6F68` | `#AAB7B1` |
| `--ds-muted` | `#87948F` | `#78857F` |
| `--ds-border` | `#DDE5E1` | `#2D3833` |
| `--ds-border-strong` | `#CBD7D1` | `#3B4942` |
| `--ds-primary` (button fill) | `#147A57` | `#147A57` |
| `--ds-on-primary` | `#FFFFFF` | `#FFFFFF` |
| `--ds-link` | `#147A57` | `#4FBF8F` |
| `--ds-link-hover` | `#0D5F4A` | `#7AD3AC` |
| `--ds-accent-text` | `#0D5F4A` | `#4FBF8F` |
| `--ds-brand-mark` | `#178A63` | `#4FBF8F` |
| `--ds-brand-panel` | `#0D5F4A` | `#14251E` |
| `--ds-focus` | `rgba(23,138,99,0.28)` | `rgba(79,191,143,0.30)` |
| `--ds-status-normal-bg` / `-text` | `#E4F3EA` / `#1F6B45` | `#1A2E23` / `#5CC98F` |
| `--ds-status-watch-bg` / `-text` | `#FBF1D6` / `#6E5109` | `#352D14` / `#E9C766` |
| `--ds-status-warning-bg` / `-text` | `#FCE8D5` / `#8A4510` | `#3A2A1A` / `#F2B27A` |
| `--ds-status-critical-bg` / `-text` | `#FBE3E3` / `#B23A3A` | `#3A1E1E` / `#F08A8A` |

Semantic fills (§9), domain tints (§8.1), and data ramps (§21A) are also
tokens, named `--ds-semantic-*`, `--ds-tint-*`, and `--ds-ramp-*`. Data ramps
have one value for both themes.

Spacing, radius, and type scale tokens follow §10, §11, and §15
(e.g. `--ds-space-16`, `--ds-radius-card`, `--ds-text-body`).

---

# 60. Implementation Stack

Fill in once and keep current. AI agents use only these.

| Concern | Library / approach |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) — `apps/web`, `apps/admin`; NestJS — `apps/api` |
| Styling | Hand-rolled global CSS per app (`globals.css`) with CSS custom-property design tokens (§59) for light/dark themes. No Tailwind, no CSS-in-JS. |
| Component primitives | None — hand-rolled components built directly on the §59 tokens (no headless-UI/Radix layer) |
| Icons | `lucide-react` — one outline icon family, tree-shakeable, no CSS framework dependency |
| Charts | `recharts` — declarative, SVG-based, themeable via CSS variables/design tokens |
| Maps | `leaflet` + `react-leaflet` (already in use in `apps/web`) |
| Date/time formatting | Native `Intl.DateTimeFormat`, explicit `timeZone: 'Asia/Dhaka'` — no date library |

---

# 61. Changelog

## 2.1 — October 2026

- Public page server HTML requirements: nav, one h1, meta description (§3.1).
- Markup order must match visual order; no duplicate desktop/mobile markup
  (§3.4, §50).
- Snapshot semantics and plural rules (§10A).
- Fixed, non-overlapping map legend bins (§21A).
- Dataset table columns (§25).
- Canonical source names; no placeholder sources (§28.1).
- Official place-name spellings and taxon name fallback (§28A).
- Landing page structure added as refactor priority 0 (§57.1).

## 2.0 — October 2026

- Interface language set to English only (§1.1).
- Theme behavior and theme control placement defined (§5.1–5.3).
- Muted color restricted to non-text uses; metadata uses Secondary Text
  (§6, §7, §10).
- Added Delta Green 600 for buttons and links, and a dark-mode green
  (§8, §18).
- Added domain icon tints (§8.1) and semantic text colors (§9.1).
- Added domain classification scales: PM2.5, UV, river discharge (§9A).
- Added number, unit, date, and time formatting; BST defined as UTC+6
  (§10A).
- Added data color ramps (§21A).
- Alert thresholds: no alerts at reference level; thresholds discoverable
  (§23).
- Data-state badge styles defined (§24).
- Workspace routes require sign-in; public pages server-rendered (§3.1, §3.2).
- Authentication layout and form rules expanded (§3.3).
- Sidebar groups updated for all current modules; account moved to top bar
  user menu (§32, §33).
- Role-based dashboard home (§34A) and data source health requirement
  (§35.1).
- Empty-state rules now apply to public summaries too (§38); no zero counters
  on public pages (§20, §29).
- Metric definitions as a single source of truth (§2.7, §41A).
- Design token names (§59) and implementation stack placeholders (§60).
- Refactor priorities listed (§57.1).

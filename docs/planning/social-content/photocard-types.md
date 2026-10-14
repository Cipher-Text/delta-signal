# Photocard Types and Editorial System

## Editorial position

Delta Signal should behave like a trusted environmental briefing service, not a dashboard screenshot generator. A good post answers one practical question for a person in Bangladesh:

- What is happening?
- Where is it happening?
- When was it observed or forecast?
- What should the reader understand or check next?

Each card should communicate one idea. The Admin Console may combine several source fields, but the visual hierarchy should never present more than three primary metrics. The source evidence panel can contain more detail than the public card.

The strongest first-version editorial mix is:

1. **Rain Watch** — short-term observed/forecast rain information.
2. **River Watch** — station level/discharge conditions with careful status language.
3. **Today in Bangladesh** — a district-level weather/climate pulse.
4. **Alert Explainer** — an existing Delta Signal alert made understandable and shareable.
5. **Verified Community Report** — a moderated local observation with clear provenance.
6. **Wild Bangladesh** — a single GBIF species observation with rights-cleared media.

These should be treated as content series with consistent names, templates, and tone. They are more useful and sustainable than producing a new visual treatment for every database table.

## Structured payload

Every card is generated from a typed payload, never from arbitrary AI-generated layout:

```json
{
  "series": "RAIN_WATCH",
  "type": "WEATHER_FORECAST",
  "location": {"districtId": "…", "nameEn": "…", "nameBn": "…"},
  "metrics": [{"label": "Rain probability", "value": 70, "unit": "%", "asOf": "…"}],
  "headline": "Rain may arrive in Sylhet tomorrow",
  "summary": "Forecast rainfall probability is 70% for 20 September.",
  "caption": "…",
  "source": "Open-Meteo daily forecast",
  "evidenceLabel": "FORECAST",
  "disclaimer": "Forecast conditions can change.",
  "timestamp": "…",
  "templateKey": "rain-watch-v1",
  "locale": "bn",
  "format": "4:5"
}
```

The backend owns validation, units, freshness, evidence labels, source traceability, and card type. AI, if added later, may suggest copy alternatives only. It must not create measurements, causal explanations, risk labels, or layout instructions.

## Recommended editorial series

| Series | Purpose and audience | Data support in repository | Public card structure | Safety / editorial rule | Phase |
|---|---|---|---|---|---|
| **Rain Watch** | Help residents plan the next day or two; broad public audience | `CurrentWeatherReading`, `HourlyWeatherForecast`, `DailyWeatherForecast`; Open-Meteo schedulers run frequently | Large rain probability or precipitation value, forecast window, district, simple rain graphic, “forecast” badge | Never phrase probability as certainty; observed rain and forecast rain must be separate series states | 1 manual, 2 suggested |
| **River Watch** | Make river conditions understandable for riverine communities, journalists, and responders | `WaterLevelReading`, `WaterLevelStation`, `StationFloodForecast`, station thresholds, flood service endpoints | Station/river, observed level or forecast discharge, trend/status, timestamp, “check official updates” footer | “Elevated discharge” is not “flooding”; show threshold status only when configured; show forecast/model label | 1 manual, 2 suggested |
| **Today in Bangladesh** | A calm daily local-weather briefing, useful for repeat engagement | District `CurrentWeatherReading` plus 30-day climate fields (`avgTemp30d`, `totalPrecip30d`, `avgPm25_30d`, etc.) | One headline, two or three metric tiles, “last updated” and district; optional small 30-day context chip | Do not mix current and 30-day values without labels; do not call a district “better/worse” without a defined benchmark | 1 manual, 2 suggested |
| **Alert Explainer** | Increase reach and comprehension of an already-issued alert | Active `Alert` and `AlertArea`, severity, issue/expiry, description/instructions | Severity/status strip, affected area, what the alert says, issued/expiry time, source | Must mirror the approved alert; social copy cannot increase severity or add unsupported instructions | 1 manual, 2 suggested |
| **Verified Community Report** | Give local people visibility while preserving moderation and privacy | `CitizenReport`, `ReportStatus`, `ReportMedia`, location and status history | Verified/resolved badge, category, general location, approved image, neutral summary | Only VERIFIED/RESOLVED; redact personal data; distinguish community evidence from sensor/official data; consent required for media/credit | 1 manual after moderation, 2 suggested |
| **Wild Bangladesh** | Make biodiversity data memorable and educational | GBIF `Occurrence`, `Species`, observed date, taxon, image/license fields | Species image/name, where/when observed, one taxonomy or ecology fact, GBIF credit | Occurrence is not abundance or population trend; publish only rights-cleared images and sufficiently identified records | 1 manual, 2 suggested |
| **Air Quality Reading** | Explain what the platform currently has without pretending it is an official health index | `HourlyAirQuality` PM2.5/PM10 and pollutant fields | Pollutant value, unit, timestamp, model/source label, “what this number means” explainer | Do not publish AQI colors, health thresholds, or medical advice until a validated national/WHO mapping and methodology is implemented | 2 after small work |
| **District Climate Pulse** | Show a 30-day local pattern rather than a single weather moment | District/upazila/union 30-day rollups and `UnionDailyClimate` | 30-day rainfall/temperature/air-quality metric with explicit window and coverage | Must show the exact 30-day window and completeness; never call it a climate trend from one month | 2 after freshness gate |
| **Coastal Conditions** | Useful seasonal information for coastal districts, fishers, and coastal readers | `MarineForecast`, coastal district flag, wave/swell/wind fields | Forecast date, wave height, dominant direction, coastal district, forecast badge | Not a navigation, storm-warning, or beach-safety notice; use only coastal districts with rows | 2 manual, 3 suggested |

## Types deliberately removed from MVP

- **Map of the Day:** useful later, but there is no deterministic Admin map-card renderer. A generic map screenshot will look inconsistent and be hard to source/interpret.
- **Historical Comparison:** valuable only after a comparison service defines baseline, period, missing days, and timezone semantics. The existing daily climate history is a foundation, not a ready comparison claim.
- **Weekly/Monthly Summary:** requires period-complete aggregation, deduplication, coverage metrics, and a scheduler. It should not be assembled from whichever rows happen to be latest.
- **Facility environmental performance:** current facility data is directory/compliance metadata, not measured emissions or verified pollution. Neutral facility profiles may be useful later, but they are not environmental evidence cards.
- **National emissions as a recurring social series:** the World Bank annual readings support occasional data explainers, not a daily/weekly audience habit.
- **Radiation/UV content:** satellite shortwave radiation is not UV exposure. This can be an educational explainer only after the distinction is made prominent.

## Copy system

### Headline patterns

- Rain Watch: `Rain forecast for {place}: {window}`
- River Watch: `{river} at {station}: {observed/forecast} condition`
- Today in Bangladesh: `Today in {district}: {plain-language condition}`
- Alert Explainer: `{alert title} — what the current alert says`
- Verified Community Report: `Verified community report from {general area}`
- Wild Bangladesh: `{species}: an observation from {place}`

Headlines should avoid “crisis”, “danger”, “flood”, “record”, “unprecedented”, “polluted”, and “climate change” unless the linked evidence and approved alert explicitly support those words.

### Caption pattern

`What we know` → `where/when` → `source and evidence label` → `what it does not mean` → `where to check next`.

Captions should be Bengali-first for local public-service series, with an English parallel field for institutional audiences. Translation must preserve numbers, dates, uncertainty, and source labels exactly. Admin review remains required for both language versions.

## Design system for every series

- Delta Signal logo in the top-left brand lockup; preserve clear space and never crop it.
- One dominant headline, one dominant metric or visual, and a maximum of three supporting metrics.
- Location and date/time are always visible; use Bangladesh-relevant place names before provider names.
- Use an evidence badge: `OBSERVED`, `FORECAST`, `ALERT`, `VERIFIED REPORT`, `GBIF OBSERVATION`, or `MODEL DATA`.
- Use color as a secondary cue, not as the meaning itself; text labels must carry status.
- Keep the source/disclaimer footer readable in 4:5 and 1:1 exports.
- Use 4:5 as the primary feed design and 1:1 as a deliberate reflow, not a crop. Reserve a third safe layout for 9:16 stories.
- Prefer simple line/range/bar visuals over decorative gauges. A chart must show its time window and units.

## Admin-editable fields

Admins may edit headline, summary, caption, Bengali/English copy, visible metric selection, location label, source note, disclaimer, template, and format. Source values, units, evidence type, observed/forecast timestamp, and source IDs are read-only; changing those requires selecting another source record.

## Future automated publishing suitability

Rain Watch, Today in Bangladesh, and Coastal Conditions can eventually support scheduled generation with freshness gates. River Watch, Alert Explainer, Verified Community Report, and Wild Bangladesh should retain human approval by default because their wording, social impact, rights, or public-safety implications are higher.

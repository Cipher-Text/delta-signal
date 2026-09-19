# Photocard Types

## Common structured contract

Every card should be generated from a typed payload, not from arbitrary model-generated layout:

```json
{
  "type": "RIVER_SIGNAL",
  "location": {"districtId": "…", "nameEn": "…", "nameBn": "…"},
  "metrics": [{"label": "…", "value": 123, "unit": "m³/s", "asOf": "…"}],
  "headline": "…",
  "summary": "…",
  "source": "…",
  "disclaimer": "…",
  "timestamp": "…",
  "templateKey": "river-signal-v1",
  "locale": "en",
  "format": "4:5"
}
```

The backend owns validation, source traceability, units, freshness, and card type. Copy may be suggested by deterministic templates or a future constrained copy service; it may not create measurements, causal explanations, or layout instructions.

## Recommended types

| Type | Purpose / audience | Data and trigger | Visual / copy shape | Localization, attribution, disclaimer | Admin edits / formats / future publishing |
|---|---|---|---|---|---|
| Daily Environmental Snapshot | A calm daily view for the general public | Current weather, AQ raw values, 30-day rollup; manual selection initially; later daily freshness rule | Metric grid plus district label; `Today in {district}: {metric}`; caption lists as-of time | English/Bengali labels; Open-Meteo and “last updated”; never imply health or climate causation | Edit headline, summary, metrics visibility, locale, source note; 4:5 and 1:1, later 9:16; publishable later after freshness gate |
| Rain Signal | Make recent/current or forecast rain understandable | `CurrentWeatherReading` precipitation or forecast precipitation/probability; threshold configured by type and time window | Rain icon + value/probability + small bars; “Rain expected” only for forecast | Clearly distinguish observed precipitation from forecast; Open-Meteo + time window | Choose observed/forecast mode, threshold label, caption; 4:5/1:1/9:16; later schedulable |
| Heat Signal | Highlight unusually hot conditions without overclaiming heatwave | Current/apparent temperature and daily max; only use HEATWAVE wording when existing official alert supports it | Large temperature, apparent temperature, date; “Hot conditions” | Model/source/time; no health advice without approved guidance; “heat signal” not heatwave unless alert | Edit temperature metric display and copy, not source value; all formats; later rule-based |
| Weather Forecast | Useful short-term planning content | Hourly/daily forecast; selected district/date range | 3–5 day strip with max/min/rain chance; “Forecast: {district}, {dates}” | Every headline/visual says Forecast; issue/retrieved time and Open-Meteo | Select days and fields; 4:5/1:1, later story; safe for scheduled draft generation |
| River / Discharge Signal | Explain river conditions and discharge forecast | Station readings/trend and/or `StationFloodForecast`; trigger on configured percentile/ratio/level | Station/river name, line/range band, discharge or level, trend | Source and station/time; “discharge forecast is not a flood declaration”; threshold status only if configured | Select observed vs forecast, metrics, wording; 4:5/1:1/9:16; later suggestions, not autonomous emergency alerts |
| Environmental Alert | Repackage an already issued alert for social reach | Active `Alert`, severity, areas, expiry, instructions; trigger on new ACTIVE alert | Severity banner, area, concise instruction | Delta Signal alert status, issued/expiry, underlying evidence/source; never strengthen severity | Edit social headline/body only with alert linkage; all formats; later scheduled publication after approval policy |
| Biodiversity / Species Observation | Share a verified species record or notable observation | GBIF `Occurrence`/`Species`, research-grade `Observation`, optional licensed image; trigger on selected record | Species image/name, place/date, taxonomy fact | GBIF/occurrence key and image license; “observation, not population estimate” | Edit common name/fact/caption, image, credit; 4:5/1:1; later safe suggestion if rights/quality gate passes |
| Citizen Report | Give visibility to a verified community incident | `CitizenReport` only VERIFIED/RESOLVED, `ReportMedia`, location/category; manual selection initially | Photo plus verified status/category/location | “Citizen report”; verification status/date; consent/privacy and no naming unless allowed | Select image/crop, redact/omit personal data, edit caption; 4:5/1:1; later only with human policy |
| Data Fact / Explainer | Turn a stable measurement or annual statistic into public education | National emissions, radiation, water-body facts, or one weather metric | One large number plus definition/context | Indicator/source, unit, year/window; define what value does not mean | Edit explanatory copy and metric label; 4:5/1:1; later scheduled for stable annual data |
| Restoration Milestone | Show measured project progress | Project activity/metric and reporting date | Progress bar/timeline or single milestone | Organization, metric definition, reporting period; do not imply ecological success beyond metric | Edit project story, metric visibility, image; 4:5/1:1; later scheduled |

## Types evaluated but deferred

- **District Environmental Snapshot:** recommended only as a version of Daily Environmental Snapshot after freshness and rollup completeness checks; otherwise it is a label for mixed-quality metrics.
- **Map of the Day:** visually attractive, but no Admin map renderer/export and no card-safe map styling currently exist. Defer until a deterministic SVG/static-map pipeline is added.
- **Historical Comparison:** valuable, but requires a documented comparison-window service, missing-data rules, and period labels. Do not infer “unusually high” from one current value.
- **Weekly Environmental Summary / Monthly Environmental Summary:** require scheduled aggregation, deduplication, coverage metrics, and period-complete source data. Defer to Phase 2/3.
- **Facility / industrial environmental overview:** neutral directory cards are possible, but facility environmental performance content is not supported by current measurements. Never publish pollution or illegality claims from compliance status alone.

## Shared copy and output rules

Headline templates should include place/time where useful and use “forecast”, “observed”, “reported”, or “GBIF occurrence” as appropriate. Captions must include source, as-of/retrieval time, unit, comparison window if any, and disclaimer. Bengali should be a parallel reviewed field, not a machine-translated afterthought. Initial output dimensions: 1080×1350 (4:5) and 1080×1080 (1:1); reserve a layout-safe model for 1080×1920 (9:16).


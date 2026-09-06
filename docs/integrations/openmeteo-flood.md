# OpenMeteo Flood

## Status

Implemented.

Delta Signal fetches a 30-day daily river-discharge forecast for every seeded Bangladesh district. This is modelled GloFAS discharge context, not an official Bangladesh flood warning.

## Provider

| Item | Value |
| --- | --- |
| Provider name | `OpenMeteo` |
| API key | Not required for non-commercial use |
| Official docs | `https://open-meteo.com/en/docs/flood-api` |
| Endpoint | `https://flood-api.open-meteo.com/v1/flood` |
| Current client | `apps/api/src/flood/flood-openmeteo.client.ts` |
| Current scheduler | Initial sync on empty table; then every 6 hours at minute 30 |
| Current storage | `FloodForecast` Prisma model |
| Public routes | `GET /flood/forecast`, `GET /flood/forecast/:districtId` |

## Available Data

The Flood API accepts latitude and longitude and returns daily river-discharge data from the largest river in a 5 km area around the coordinate.

### Daily Flood Variables

Available fields include:

- `river_discharge`
- `river_discharge_mean`
- `river_discharge_median`
- `river_discharge_max`
- `river_discharge_min`
- `river_discharge_p25`
- `river_discharge_p75`

The discharge unit is `m3/s`. Ensemble statistics are available for forecasts, not consolidated historical data.

## Forecast Windows

OpenMeteo documents:

- Default forecast window: 92 days, shown as about 3 months in the UI.
- Maximum forecast window through the API parameter table: 210 days.
- Source coverage from 1984-01-01 through roughly 7 months of forecast.

## Source Notes

- Data source is GloFAS, the Global Flood Awareness System.
- Default model is GloFAS v4 seamless data.
- Spatial resolution is about 5 km for GloFAS v4.
- OpenMeteo warns that the closest river may not be selected correctly at 5 km resolution.
- OpenMeteo suggests varying coordinates by about 0.1 degrees to find a more representative river-discharge point.
- This API gives simulated river discharge, not official Bangladesh flood warnings.

## Possible Delta Signal Use

Candidate use cases:

- River-discharge context for alerts and reports.
- Flood-risk trend panels for river-adjacent districts.
- Historical river-flow context for restoration and water-body monitoring.
- A supporting source alongside official FFWC data if FFWC is later integrated.

## Implementation Notes

- The `flood` module is separate from `weather`, with its own client, service, scheduler, controller, and DTO.
- District coordinates are the initial monitoring points. OpenMeteo may select the nearest supported river/grid cell, so river-specific coordinates should be added later for high-value basins.
- Each scheduler run creates an `IngestionJob` for the shared `OpenMeteo` provider.
- The dataset catalog includes `OpenMeteo Flood Forecasts` under `WATER`.
- Keep official alert authority separate from model-derived discharge data.

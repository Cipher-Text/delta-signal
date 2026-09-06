# OpenMeteo Marine Weather

## Status

Implemented (2026-08-28).

## Provider

| Item | Value |
| --- | --- |
| Provider name | `OpenMeteo` |
| API key | Not required for non-commercial use |
| Official docs | `https://open-meteo.com/en/docs/marine-weather-api` |
| Endpoint | `https://marine-api.open-meteo.com/v1/marine` |
| Current client | `MarineOpenMeteoClient` (`apps/api/src/marine/marine-openmeteo.client.ts`) |
| Current scheduler | `MarineScheduler` — daily at 2am; initial sync on empty table |
| Current storage | `MarineForecast` — one row per district per day (coastal districts only; inland districts produce no rows) |

## Available Data

The Marine Weather API accepts latitude and longitude and returns marine forecasts for sea grid cells. It supports hourly, daily, and current variables.

### Hourly Marine Variables

Important fields available from OpenMeteo include:

- `wave_height`
- `wave_direction`
- `wave_period`
- `wave_peak_period`
- `wind_wave_height`
- `wind_wave_direction`
- `wind_wave_period`
- `wind_wave_peak_period`
- `swell_wave_height`
- `swell_wave_direction`
- `swell_wave_period`
- `swell_wave_peak_period`
- `secondary_swell_wave_height`
- `secondary_swell_wave_period`
- `secondary_swell_wave_direction`
- `tertiary_swell_wave_height`
- `tertiary_swell_wave_period`
- `tertiary_swell_wave_direction`
- `sea_level_height_msl`
- `sea_surface_temperature`
- `ocean_current_velocity`
- `ocean_current_direction`
- `invert_barometer_height`

### Daily Marine Variables

Important daily aggregations include:

- `wave_height_max`
- `wave_direction_dominant`
- `wave_period_max`
- `wind_wave_height_max`
- `wind_wave_direction_dominant`
- `wind_wave_period_max`
- `wind_wave_peak_period_max`
- `swell_wave_height_max`
- `swell_wave_direction_dominant`
- `swell_wave_period_max`
- `swell_wave_peak_period_max`

## Forecast Windows

OpenMeteo documents marine forecasts as 7 days by default, with up to 16 days available in the page overview. The API parameter table currently lists `forecast_days` as up to 8 days. Treat this as provider documentation ambiguity and verify with live API calls before implementation.

## Source Notes

- The API defaults to sea-oriented grid-cell selection.
- Tides and ocean currents are modelled at roughly 0.08 degree resolution.
- OpenMeteo warns that tide and ocean-current accuracy is limited in coastal areas.
- OpenMeteo states marine data is not suitable for coastal navigation and does not replace nautical references.
- Returned latitude and longitude identify the selected marine grid cell, which may differ from the requested coordinate.

## Possible Delta Signal Use

Candidate use cases:

- Coastal hazard context for districts such as Cox's Bazar, Chattogram, Khulna, Satkhira, Barguna, Patuakhali, Bhola, and Noakhali.
- Bay of Bengal wave-height and swell monitoring.
- Sea-surface temperature context for marine biodiversity or fisheries-adjacent reporting.
- Coastal restoration project risk context.

## Implementation

Module: `apps/api/src/marine/`. Fetches 11 daily wave/swell/wind-wave variables for all 64 district centroids using a 7-day forecast window. OpenMeteo snaps each coordinate to the nearest marine grid cell; inland districts produce a fetch error that is logged as `warn` and skipped — only coastal districts (Cox's Bazar, Chattogram, Khulna, Satkhira, etc.) resolve to valid sea grid cells. Upserts all 7 rows per district atomically in a single `$transaction`. The scheduler runs at 2am daily (offset from climate at midnight and radiation at 1am) and on first boot if the table is empty. Each run creates a shared `IngestionJob` against the OpenMeteo provider. Public endpoints: `GET /marine/forecast` and `GET /marine/forecast/:districtId?from=&to=`. Dataset catalog entry: "OpenMeteo Marine Weather" (WATER / PUBLIC).

Note: SST (`sea_surface_temperature`) and ocean current variables are hourly-only in the Marine API and are not yet stored — only the 11 daily wave/swell aggregates are persisted. Sea-surface temperature can be added as a separate hourly table in a future pass.

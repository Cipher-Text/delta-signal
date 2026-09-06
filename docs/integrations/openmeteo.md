# OpenMeteo

## Status

Implemented in `apps/api/src/weather/`.

OpenMeteo provides weather and air-quality data for seeded Bangladesh districts. The integration is owned by the `weather` module and exposed through public weather and dataset endpoints.

## Provider

| Item | Value |
| --- | --- |
| Provider name | `OpenMeteo` |
| API key | Not required |
| Official forecast docs | `https://open-meteo.com/en/docs` |
| Official air-quality docs | `https://open-meteo.com/en/docs/air-quality-api` |
| Forecast endpoint | `https://api.open-meteo.com/v1/forecast` |
| Air-quality endpoint | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| Client | `apps/api/src/weather/weather-openmeteo.client.ts` |
| Scheduler | `apps/api/src/weather/weather.scheduler.ts` |

## Fetched Data

The selected variables below are a deliberately small subset of OpenMeteo's available weather and air-quality variables. The official forecast API supports additional hourly/current/daily fields such as pressure, visibility, dewpoint, wind gusts, soil data, solar radiation, and model selection. The official air-quality API also supports AQI fields, pollen, dust, aerosol optical depth, and additional gases, but Delta Signal does not request those yet.

### Current Weather

Requested fields:

- `temperature_2m`
- `relative_humidity_2m`
- `apparent_temperature`
- `is_day`
- `wind_speed_10m`
- `wind_direction_10m`
- `precipitation`
- `weather_code`
- `cloud_cover`

### Hourly Weather

Requested for 3 forecast days:

- `temperature_2m`
- `relative_humidity_2m`
- `apparent_temperature`
- `precipitation_probability`
- `precipitation`
- `weather_code`
- `wind_speed_10m`
- `wind_direction_10m`
- `cloud_cover`

### Daily Weather

Requested for 7 forecast days:

- `weather_code`
- `temperature_2m_max`
- `temperature_2m_min`
- `apparent_temperature_max`
- `apparent_temperature_min`
- `precipitation_sum`
- `precipitation_probability_max`
- `wind_speed_10m_max`
- `uv_index_max`
- `sunrise`
- `sunset`

### Hourly Air Quality

Requested for 3 forecast days:

- `pm10`
- `pm2_5`
- `carbon_monoxide`
- `nitrogen_dioxide`
- `sulphur_dioxide`
- `ozone`
- `uv_index`

These pollutant fields are returned as hourly values. OpenMeteo documents PM, CO, NO2, SO2, and ozone concentrations in `ug/m3`-style units, and UV index as an index value.

### Air-Quality Fields Not Requested Yet

OpenMeteo also exposes air-quality variables that Delta Signal does not currently request or store:

- European AQI: `european_aqi`, `european_aqi_pm2_5`, `european_aqi_pm10`, `european_aqi_nitrogen_dioxide`, `european_aqi_ozone`, `european_aqi_sulphur_dioxide`
- United States AQI: `us_aqi`, `us_aqi_pm2_5`, `us_aqi_pm10`, `us_aqi_nitrogen_dioxide`, `us_aqi_ozone`, `us_aqi_sulphur_dioxide`, `us_aqi_carbon_monoxide`
- Other pollutants and atmospheric fields: `carbon_dioxide`, `aerosol_optical_depth`, `dust`, `methane`, `uv_index_clear_sky`, and several Europe-only pollen fields

The OpenMeteo air-quality API also supports `current=` variables. Delta Signal currently uses only `hourly=` air-quality requests and then serves latest rows from stored hourly data.

## Storage

OpenMeteo data is stored in:

- `CurrentWeatherReading`
- `HourlyWeatherForecast`
- `DailyWeatherForecast`
- `HourlyAirQuality`

All weather tables are keyed by `districtId`. Latitude and longitude are also stored on each reading for provenance, copied from the district coordinates used for the fetch.

## Schedule

| Job | Cron | Cadence |
| --- | --- | --- |
| Current weather | `0 */15 * * * *` | Every 15 minutes |
| Hourly weather + air quality | `0 0 */2 * * *` | Every 2 hours |
| Daily weather | `0 0 */12 * * *` | Every 12 hours |

Each scheduler run creates an ingestion job when the `OpenMeteo` provider exists. Successful runs update matching dataset `lastSyncedAt` values.

## Forecast Windows

Delta Signal currently requests:

- 3 days for hourly weather.
- 3 days for hourly air quality.
- 7 days for daily weather.

OpenMeteo forecast docs allow weather forecasts up to 16 days. OpenMeteo air-quality docs default to 5 days and allow up to 7 days. The shorter Delta Signal hourly windows are an implementation choice, not an OpenMeteo API limit.

## Source Notes

- Weather forecast data is requested with `timezone=auto`, so returned timestamps are local to the requested district coordinates.
- OpenMeteo says current weather conditions are based on 15-minute model data.
- OpenMeteo air quality is based on CAMS forecasts. For Bangladesh, this generally means the global CAMS domain rather than the European CAMS domain.
- OpenMeteo notes that the returned latitude and longitude identify the selected weather or air-quality grid cell, which may be a few kilometres away from the requested district coordinate.

## Public API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/weather/current` | Latest current weather for every district |
| `GET` | `/weather/current/:districtId` | Latest current weather for one district |
| `GET` | `/weather/hourly/:districtId` | Hourly forecast for one district |
| `GET` | `/weather/daily/:districtId` | Daily forecast for one district |
| `GET` | `/weather/air-quality` | Latest air-quality reading for every district |
| `GET` | `/weather/air-quality/:districtId` | Latest air-quality reading for one district |
| `GET` | `/datasets/weather/current` | Dataset-facing current weather |
| `GET` | `/datasets/air-quality/current` | Dataset-facing current air quality |

## Known Gaps

- No BMD local-station integration yet.
- No WAQI station-level AQI integration yet.
- No OpenMeteo AQI fields are requested or stored yet.
- No OpenMeteo Climate integration yet; see [OpenMeteo Climate](openmeteo-climate.md).
- OpenMeteo Flood is implemented in a separate `flood` module; see [OpenMeteo Flood](openmeteo-flood.md).
- No OpenMeteo Marine Weather integration yet; see [OpenMeteo Marine Weather](openmeteo-marine.md).
- No OpenMeteo Satellite Radiation integration yet; see [OpenMeteo Satellite Radiation](openmeteo-satellite-radiation.md).
- No soil temperature, soil moisture, or multi-height wind fields are stored.
- `HourlyAirQuality` has no provider/source column yet, so adding another AQ provider will need a schema decision.

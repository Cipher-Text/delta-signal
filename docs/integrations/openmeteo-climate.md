# OpenMeteo Climate

## Status

Implemented (2026-08-26).

Delta Signal now uses the OpenMeteo forecast and air-quality APIs to build operational climate summaries at union level. See the Implementation section below for details. The OpenMeteo Climate API (long-range climate model projections) remains a separate future candidate — see "Possible Delta Signal Use" below.

## Implementation

**Module:** `LocationClimateModule` at `apps/api/src/locations/climate/`

**`LocationClimateService`** calls two OpenMeteo APIs in batch:

- Forecast API — daily variables: `temperature_2m_max`, `temperature_2m_min`, `temperature_2m_mean`, `precipitation_sum`, `wind_speed_10m_mean`, `uv_index_max`
- Air Quality API — hourly variables: `pm10`, `pm2_5`, `ozone`, `uv_index`; also hourly `relative_humidity_2m` and `cloud_cover` from the forecast API

Up to 1,000 union coordinates are sent per HTTP request. With 4,540 unions, the full nightly run completes in 6 HTTP requests total. The service reuses `WeatherOpenMeteoClient` exported from `WeatherModule`.

**`LocationClimateScheduler`** runs daily at midnight via `@Cron('0 0 0 * * *')`.

**Storage:**

- `UnionDailyClimate` — raw daily record per union per day (unique on `(unionId, date)`). Fields: `avgTemp`, `minTemp`, `maxTemp`, `avgHumidity`, `totalPrecip`, `avgWindSpeed`, `maxWindSpeed`, `avgCloudCover`, `avgPm25`, `avgPm10`, `avgUvIndex`, `avgOzone`, `fetchedAt`.
- 11 rolling-average columns on each of the 4 geography models (`Division`, `District`, `Upazila`, `Union`): `avgTemp30d`, `minTemp30d`, `maxTemp30d`, `avgHumidity30d`, `totalPrecip30d`, `avgWindSpeed30d`, `avgCloudCover30d`, `avgPm25_30d`, `avgPm10_30d`, `avgUvIndex30d`, `climateUpdatedAt`.

**Aggregation:** After raw data is upserted, 30-day rolling averages are recomputed bottom-up — Union → Upazila → District → Division — via bulk `UPDATE … FROM (SELECT … GROUP BY)` SQL (one pass per geographic level).

> **Note:** This implementation uses the standard OpenMeteo forecast API and air-quality API, NOT the OpenMeteo Climate API (`climate-api.open-meteo.com`). The goal is operational climate summaries at union level for Delta Signal's public data pages and alert context. The long-range climate projection API documented below remains a future candidate.

## Provider

| Item | Value |
| --- | --- |
| Provider name | `OpenMeteo` |
| API key | Not required for non-commercial use |
| Official docs | `https://open-meteo.com/en/docs/climate-api` |
| Endpoint | `https://climate-api.open-meteo.com/v1/climate` |
| Current client | `LocationClimateService` (reuses `WeatherOpenMeteoClient`) |
| Current scheduler | `LocationClimateScheduler` — daily at midnight |
| Current storage | `UnionDailyClimate` + 11 rolling-average columns on each geography model |

## Available Data

The Climate API accepts latitude, longitude, a date interval, selected climate models, and daily variables. It returns daily aggregated climate data from regional downscaled climate models.

### Daily Climate Variables

Important fields available from OpenMeteo include:

- `temperature_2m_mean`
- `temperature_2m_max`
- `temperature_2m_min`
- `wind_speed_10m_mean`
- `wind_speed_10m_max`
- `cloud_cover_mean`
- `shortwave_radiation_sum`
- `relative_humidity_2m_mean`
- `relative_humidity_2m_max`
- `relative_humidity_2m_min`
- `dewpoint_2m_mean`
- `dewpoint_2m_max`
- `dewpoint_2m_min`
- `precipitation_sum`
- `rain_sum`
- `snowfall_sum`
- `pressure_msl_mean`
- `soil_moisture_0_to_10cm_mean`
- `et0_fao_evapotranspiration`

## Climate Models

The API supports multiple climate models:

- `CMCC_CM2_VHR4`
- `FGOALS_f3_H`
- `HiRAM_SIT_HR`
- `MRI_AGCM3_2_S`
- `EC_Earth3P_HR`
- `MPI_ESM1_2_XR`
- `NICAM16_8S`

Not every model supports every variable. OpenMeteo documents soil moisture as available only for selected models.

## Time Range

OpenMeteo documents climate data from `1950-01-01` to `2050-01-01` and recommends using the full `1950` to `2050` range for climate analysis. Projections beyond 2050 are not part of this API.

## Source Notes

- Data is based on HighResMIP climate models from the CMIP6 project.
- OpenMeteo downscales data to about 10 km resolution and applies ERA5-Land bias correction by default.
- Historical years in this API are model validation data, not measured station observations.
- Future projections are close to RCP8.5 within CMIP6, according to OpenMeteo.
- Model uncertainty is significant; OpenMeteo recommends running analyses across multiple models and evaluating performance.
- Returned latitude and longitude identify the selected grid cell, which may differ from the requested coordinate.

## Possible Delta Signal Use

Candidate use cases:

- Long-term climate-risk pages for districts.
- Heat, rainfall, drought, and humidity trend datasets.
- Restoration project planning context.
- Climate-change education and public dashboards.
- Agriculture and public-health risk analysis when combined with local reports and observations.

## Future Work (Climate Projection API)

The items below apply specifically to integrating the OpenMeteo Climate API (`climate-api.open-meteo.com`) for long-range projections — not to the operational climate pipeline above, which is already implemented.

- Add climate projection schema models; current weather and `UnionDailyClimate` tables are operational records and are not designed for multi-model climate projections.
- Decide storage granularity: district centroids, divisions, selected ecological zones, or user-requested locations.
- Decide whether to store every model separately or derived aggregates only.
- Add a dedicated OpenMeteo climate-projection client (separate from `WeatherOpenMeteoClient`).
- Prefer batch ingestion over frequent cron; the projection dataset is long-range and heavy.
- Add public API routes and dataset catalog entries.

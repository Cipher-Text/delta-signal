# OpenMeteo Seasonal Forecast

## Status

Documented as a future integration. Delta Signal does not currently fetch or
store OpenMeteo seasonal forecast data.

**Roadmap decision:** strategically relevant, but deferred until core
report-to-agency response workflows and official Bangladesh weather and flood
source integrations are stronger. See the [roadmap decision](../roadmap.md#seasonal-forecast-decision).

## Provider

| Item | Value |
| --- | --- |
| Provider name | `OpenMeteo` |
| API key | Not required for non-commercial use |
| Official docs | `https://open-meteo.com/en/docs/seasonal-forecast-api` |
| Endpoint | `https://seasonal-api.open-meteo.com/v1/seasonal` |
| Current client | None |
| Current scheduler | None |
| Current storage | None |

## API Overview

The Seasonal Forecast API provides ECMWF sub-seasonal and long-range forecasts
at approximately 36 km resolution. It combines:

- **EC46** forecasts for up to 46 days, updated daily at approximately 20:30 UTC.
- **SEAS5** forecasts for up to 7 months, updated monthly on the 5th.
- 51 ensemble members, plus ensemble mean and spread options.

The default seasonal seamless model uses EC46 for the first 46 days and then
switches to SEAS5. Forecasts are global and are intended as broad area
guidance, not as locally bias-corrected predictions.

## Example Request

Example request for Dhaka using monthly mean temperature and precipitation:

```text
https://seasonal-api.open-meteo.com/v1/seasonal?latitude=23.8103&longitude=90.4125&daily=temperature_2m_mean,precipitation_sum&timezone=Asia%2FDhaka
```

The API accepts latitude and longitude, a timezone, forecast length, selected
model, and requested variables. Multiple coordinates can be submitted for
batch requests.

## Available Data

### Daily Variables

Examples include:

- `temperature_2m_mean`, `temperature_2m_min`, `temperature_2m_max`
- `precipitation_sum`
- `rain_sum`
- `relative_humidity_2m_mean`
- `cloud_cover_mean`
- `wind_speed_10m_mean`
- `reference_evapotranspiration_sum`
- `soil_temperature_0_to_7cm_mean`
- `soil_moisture_0_to_7cm_mean`

### Weekly Variables

Weekly data includes mean and anomaly values for temperature, precipitation,
soil temperature, pressure, cloud cover, sunshine duration, wind, and selected
additional variables.

### Monthly Variables

Monthly data includes mean and anomaly values for temperature, precipitation,
cloud cover, sunshine duration, shortwave radiation, pressure, wind, soil
conditions, and additional hydrological variables such as runoff and
evapotranspiration.

### Ensemble and Extremes

The API can provide ensemble spread, temperature and precipitation anomalies,
Extreme Forecast Index (EFI), and Shift of Tails (SOT). Anomalies compare the
forecast with a long-term model climatology; they are not observations from
Bangladesh weather stations.

## Possible Delta Signal Use

Potential uses include:

- Seasonal wet/dry outlooks for districts and river basins.
- Temperature and precipitation anomaly context for public dashboards.
- Early planning signals for flood, drought, agriculture, and restoration work.
- Ensemble uncertainty indicators alongside alerts and reports.

## Integration Considerations

- Store forecast issue/run time separately from the target period.
- Keep model, ensemble member, and variable metadata for reproducibility.
- Prefer ensemble mean and anomaly data for public summaries; retain member
  data only where uncertainty analysis justifies the storage cost.
- Use district or basin aggregation rather than presenting the 36 km grid as a
  local station measurement.
- Add ingestion-job tracking and provider-failure handling consistent with the
  other OpenMeteo integrations.

## Known Limitations

- Forecasts are not currently bias-corrected or downscaled for local
  conditions.
- Individual ensemble forecasts are retained for a shorter period than
  ensemble mean values.
- Seasonal forecasts express probabilities and broad tendencies; they should
  not be used as deterministic event forecasts.
- Snow-related variables are available in the API but are not relevant to
  Bangladesh-focused Delta Signal views.

## Source Notes

- [OpenMeteo Seasonal Forecast API documentation](https://open-meteo.com/en/docs/seasonal-forecast-api)
- [OpenMeteo general API documentation](https://open-meteo.com/en/docs)

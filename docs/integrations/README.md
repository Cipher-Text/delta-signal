# Third-Party Data Sources

Delta Signal keeps one source note per external data provider. These files document what is fetched, where it is stored, how often it syncs, and what is intentionally not covered yet.

| Source | Status | Data |
| --- | --- | --- |
| [OpenMeteo](openmeteo.md) | Implemented | Weather forecasts and air quality for Bangladesh districts |
| [OpenMeteo Climate](openmeteo-climate.md) | Implemented (operational pipeline) | 30-day rolling climate averages from forecast/AQ APIs at union level; long-range Climate API projections remain future work |
| [OpenMeteo Flood](openmeteo-flood.md) | Implemented | Daily GloFAS river-discharge forecasts for Bangladesh districts |
| [OpenMeteo Marine Weather](openmeteo-marine.md) | Implemented | Wave, swell, sea-level, sea-surface temperature, and ocean-current forecasts |
| [OpenMeteo Satellite Radiation](openmeteo-satellite-radiation.md) | Implemented | Satellite-derived solar radiation and sunshine data |
| [OpenMeteo Seasonal Forecast](openmeteo-seasonal.md) | Documented (future integration) | ECMWF sub-seasonal and up-to-7-month ensemble forecasts, anomalies, and extremes |
| [GBIF](gbif.md) | Implemented | Species taxonomy and occurrence records for Bangladesh |

Planning notes for future providers remain in [../ingestion-plan.md](../ingestion-plan.md).

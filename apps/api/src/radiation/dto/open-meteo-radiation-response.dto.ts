/**
 * Raw response from the OpenMeteo Satellite Archive API.
 * Native temporal resolution: satellite-specific (10, 15, or 30-minute intervals).
 * shortwave_radiation values are in W/m².
 */
export interface SatelliteArchiveRawResponse {
  latitude:  number;
  longitude: number;
  daily: {
    time:                    string[];
    sunrise:                 (string | null)[];
    sunset:                  (string | null)[];
    shortwave_radiation_sum: (number | null)[]; // MJ/m²
    sunshine_duration:       (number | null)[]; // seconds
    daylight_duration:       (number | null)[]; // seconds
  };
  hourly: {
    time:                 string[];             // ISO timestamps e.g. '2026-08-21T00:10'
    shortwave_radiation:  (number | null)[];    // W/m²
  };
}

/**
 * Normalised daily shape returned by RadiationOpenMeteoClient.fetch() —
 * the service and scheduler only see this interface.
 * Daily values come directly from the archive response. The database currently
 * persists only shortwave_radiation_sum.
 */
export interface OpenMeteoRadiationResponse {
  latitude:  number;
  longitude: number;
  daily: {
    time:                    string[];
    sunrise?:                (string | null)[];
    sunset?:                 (string | null)[];
    shortwave_radiation_sum: (number | null)[];
    sunshine_duration:       (number | null)[];
    daylight_duration:       (number | null)[];
  };
}

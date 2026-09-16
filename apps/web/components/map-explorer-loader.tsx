'use client';

import dynamic from 'next/dynamic';
import type { CurrentWeatherReading, HourlyAirQualityReading, StationFloodForecast, WaterBody, WaterLevelStation } from '@delta-signal/contracts';
import type { MapAlert, MapDistrict, MapReport, MapLayer } from './map-client';

/**
 * Next 15 forbids `next/dynamic(..., { ssr: false })` inside a Server
 * Component — Leaflet touches `window` at module load, so this indirection
 * (a Client Component wrapping the dynamic import) is required to keep the
 * map page itself a Server Component.
 */
const MapExplorerClient = dynamic(() => import('./map-explorer-client'), {
  ssr: false,
  loading: () => <div className="map-explorer-loading">Loading Bangladesh environmental map…</div>,
});

export default function MapExplorerLoader(props: {
  districts: MapDistrict[];
  alerts: MapAlert[];
  reports: MapReport[];
  weather: CurrentWeatherReading[];
  airQuality: HourlyAirQualityReading[];
  waterBodies: WaterBody[];
  stations: WaterLevelStation[];
  flood: StationFloodForecast[];
  isLive: boolean;
  initialLayer?: MapLayer;
  initialDistrictId?: string;
}) {
  return <MapExplorerClient {...props} />;
}

import Link from 'next/link';
import { routes, type Alert, type CitizenReport, type CurrentWeatherReading, type HourlyAirQualityReading, type StationFloodForecast, type WaterBodyPagedResponse, type WaterLevelStationPagedResponse } from '@delta-signal/contracts';
import PublicNav from '../../../components/public-nav';
import { apiGet } from '../../../lib/api';
import type { MapAlert, MapDistrict, MapReport, MapLayer } from '../../../components/map-client';
import MapExplorerClient from '../../../components/map-explorer-loader';

interface DistrictRow { id: string; name: string; lat: number | null; lng: number | null; division?: { name: string }; }
interface PageProps { searchParams: Promise<{ layer?: string; district?: string }>; }

export default async function MapPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const [districtsResult, alertsResult, reportsResult, weatherResult, airResult, waterResult, stationResult, floodResult] = await Promise.allSettled([
    apiGet<DistrictRow[]>(routes.locations.districts),
    apiGet<{ data: Alert[] }>(`${routes.alerts.list}?status=ACTIVE&pageSize=100`),
    apiGet<{ data: CitizenReport[] }>(`${routes.reports.list}?status=VERIFIED&pageSize=100`),
    apiGet<CurrentWeatherReading[]>(routes.weather.current),
    apiGet<HourlyAirQualityReading[]>(routes.weather.airQuality),
    apiGet<WaterBodyPagedResponse>(`${routes.waterBodies.list}?limit=100`),
    apiGet<WaterLevelStationPagedResponse>(`${routes.waterBodies.stations}?limit=100`),
    apiGet<StationFloodForecast[]>(routes.flood.forecast),
  ]);
  const districts = districtsResult.status === 'fulfilled' ? districtsResult.value : [];
  const districtPoints: MapDistrict[] = districts.filter((d): d is DistrictRow & { lat: number; lng: number } => d.lat != null && d.lng != null).map((d) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, division: d.division?.name }));
  const byId = new Map(districtPoints.map((d) => [d.id, d]));
  const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value.data.map((a) => ({ id: a.id, title: a.title, severity: a.severity, districtId: a.district?.id ?? null, districtName: a.district?.name ?? null })) : [] as MapAlert[];
  const reports = reportsResult.status === 'fulfilled' ? reportsResult.value.data.filter((r) => r.lat != null && r.lng != null || r.districtId && byId.has(r.districtId)).map((r) => { const fallback = r.districtId ? byId.get(r.districtId) : undefined; return { id: r.id, title: r.title, category: r.category, lat: r.lat ?? fallback!.lat, lng: r.lng ?? fallback!.lng, districtName: r.district?.name ?? null }; }) : [] as MapReport[];
  const validLayer: MapLayer = ['alerts', 'flood', 'weather', 'air-quality', 'reports', 'water-bodies', 'stations'].includes(searchParams.layer ?? '') ? searchParams.layer as MapLayer : 'alerts';
  return <><PublicNav /><main className="map-page"><div className="map-page-heading"><div><p className="eyebrow">Delta Signal explorer</p><h1>Environmental map</h1><p>Explore current conditions, hazards, nature, and verified community activity across Bangladesh.</p></div><div className="map-page-meta"><span className="tag info">{districtPoints.length} districts mapped</span><span className="map-observed-note">Observed data is labelled by source and freshness.</span></div></div><section className="map-explorer-layout" aria-label="Bangladesh environmental map explorer"><MapExplorerClient districts={districtPoints} alerts={alerts} reports={reports} weather={weatherResult.status === 'fulfilled' ? weatherResult.value : []} airQuality={airResult.status === 'fulfilled' ? airResult.value : []} waterBodies={waterResult.status === 'fulfilled' ? waterResult.value.data : []} stations={stationResult.status === 'fulfilled' ? stationResult.value.data : []} flood={floodResult.status === 'fulfilled' ? floodResult.value : []} isLive={[districtsResult, alertsResult, reportsResult].some((r) => r.status === 'fulfilled')} initialLayer={validLayer} initialDistrictId={searchParams.district} /></section><p className="map-accessibility-note">Keyboard users can move through the layer controls and selected feature links. Important alerts are also available on the <Link href="/alerts">alerts page</Link>.</p></main></>;
}

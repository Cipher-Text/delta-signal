'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import type { CurrentWeatherReading, HourlyAirQualityReading, StationFloodForecast, WaterBody, WaterLevelStation } from '@delta-signal/contracts';
import type { MapAlert, MapDistrict, MapReport, MapLayer } from './map-client';

const BD_BOUNDS: [[number, number], [number, number]] = [[20.3, 87.8], [26.8, 92.8]];
const COLORS: Record<string, string> = { INFO: '#3b82f6', WATCH: '#d97706', WARNING: '#ea580c', EMERGENCY: '#dc2626' };
function titleCase(v: string) { return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function Resize() { const map = useMap(); useEffect(() => { const id = window.setTimeout(() => map.invalidateSize(), 80); return () => window.clearTimeout(id); }, [map]); return null; }

export default function MapExplorerClient({ districts, alerts, reports, weather, airQuality, waterBodies, stations, flood, isLive, initialLayer = 'alerts', initialDistrictId }: { districts: MapDistrict[]; alerts: MapAlert[]; reports: MapReport[]; weather: CurrentWeatherReading[]; airQuality: HourlyAirQualityReading[]; waterBodies: WaterBody[]; stations: WaterLevelStation[]; flood: StationFloodForecast[]; isLive: boolean; initialLayer?: MapLayer; initialDistrictId?: string; }) {
  const [layer, setLayer] = useState<MapLayer>(initialLayer);
  const [selectedId, setSelectedId] = useState(initialDistrictId ?? null);
  const [search, setSearch] = useState('');
  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const selected = selectedId ? byId.get(selectedId) : null;
  const weatherById = useMemo(() => new Map(weather.map((r) => [r.districtId, r])), [weather]);
  const airById = useMemo(() => new Map(airQuality.map((r) => [r.districtId, r])), [airQuality]);
  const layerGroups: Array<{ label: string; items: Array<[MapLayer, string]> }> = [
    { label: 'Conditions', items: [['weather', 'Weather'], ['air-quality', 'Air quality'], ['flood', 'Flood / river']] },
    { label: 'Hazards', items: [['alerts', 'Alerts']] },
    { label: 'Nature', items: [['water-bodies', 'Water bodies'], ['stations', 'Water stations']] },
    { label: 'Human impact', items: [['reports', 'Verified reports']] },
  ];
  const centerFor = (id: string | null): [number, number] => { const d = id ? byId.get(id) : null; return d ? [d.lat, d.lng] : [23.7, 90.4]; };
  const layerLabel = layerGroups.flatMap((g) => g.items).find(([id]) => id === layer)?.[1] ?? 'Alerts';
  const filteredBodies = waterBodies.filter((w) => w.latitude != null && w.longitude != null);
  const filteredStations = stations.filter((s) => s.latitude != null && s.longitude != null);
  const matches = search.trim().length > 1 ? districts.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [];

  return <div className="map-explorer-shell">
    <div className="map-search map-search-inline"><label htmlFor="map-location-search">Search a district</label><input id="map-location-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try Sylhet or Dhaka" />{matches.length > 0 && <div className="map-search-results">{matches.map((d) => <button type="button" key={d.id} onClick={() => { setSelectedId(d.id); setSearch(''); }}>{d.name}<span>{d.division ? `${d.division} Division` : 'Bangladesh'}</span></button>)}</div>}{search.trim().length > 1 && matches.length === 0 && <p className="map-search-empty">No matching district in the current location index.</p>}</div>
    <div className="map-explorer-layers" aria-label="Map layers">{layerGroups.map((group) => <div className="map-layer-group" key={group.label}><span>{group.label}</span>{group.items.map(([id, label]) => <button type="button" key={id} className={layer === id ? 'is-active' : ''} aria-pressed={layer === id} onClick={() => setLayer(id)}><i className={`layer-dot layer-${id}`} />{label}</button>)}</div>)}</div>
    <div className="map-explorer-canvas"><MapContainer bounds={BD_BOUNDS} boundsOptions={{ padding: [12, 12] }} style={{ height: '100%', width: '100%' }} scrollWheelZoom attributionControl><Resize /><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {districts.map((d) => <CircleMarker key={`d-${d.id}`} center={[d.lat, d.lng]} radius={5} pathOptions={{ color: '#5f8b76', fillColor: '#e0f0e8', fillOpacity: .9, weight: 1.5 }} eventHandlers={{ click: () => setSelectedId(d.id) }}><Popup><div className="map-popup"><span className="popup-kicker">District</span><strong>{d.name}</strong><Link href={`/locations/districts/${d.id}`}>View district →</Link></div></Popup></CircleMarker>)}
      {layer === 'alerts' && alerts.map((a) => { const color = COLORS[a.severity] ?? '#6b7280'; return <CircleMarker key={a.id} center={centerFor(a.districtId)} radius={a.severity === 'EMERGENCY' ? 16 : 11} pathOptions={{ color, fillColor: color, fillOpacity: .9, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker" style={{ color }}>{a.severity} alert</span><strong>{a.title}</strong><span>{a.districtName ?? 'Nationwide'}</span><Link href={`/alerts/${a.id}`}>View alert →</Link></div></Popup></CircleMarker>; })}
      {layer === 'reports' && reports.map((r) => <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={7} pathOptions={{ color: '#2f7d5c', fillColor: '#2f7d5c', fillOpacity: .85 }}><Popup><div className="map-popup"><span className="popup-kicker">Verified report</span><strong>{r.title}</strong><span>{titleCase(r.category)} · {r.districtName ?? 'Mapped location'}</span><Link href={`/reports/${r.id}`}>View report →</Link></div></Popup></CircleMarker>)}
      {layer === 'weather' && weather.map((r) => <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#dbeafe', fillOpacity: .95, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker">Observed · Open-Meteo</span><strong>{r.district?.name ?? 'Weather reading'}</strong><span>{r.temperature2m != null ? `${r.temperature2m}°C` : 'Temperature unavailable'}</span></div></Popup></CircleMarker>)}
      {layer === 'air-quality' && airQuality.map((r) => <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={8} pathOptions={{ color: '#7c3aed', fillColor: '#ede9fe', fillOpacity: .95, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker">Observed · air quality</span><strong>{r.district?.name ?? 'Air quality reading'}</strong><span>{r.pm25 != null ? `PM2.5 ${r.pm25} µg/m³` : 'PM2.5 unavailable'}</span></div></Popup></CircleMarker>)}
      {layer === 'flood' && flood.map((r) => <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={8} pathOptions={{ color: '#d97706', fillColor: '#fef3c7', fillOpacity: .95, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker">Forecast · river conditions</span><strong>{r.station?.name ?? 'Water-level station'}</strong><span>{r.riverDischarge != null ? `Discharge ${r.riverDischarge}` : 'Discharge unavailable'} · {r.station?.district?.name ?? 'District unavailable'}</span><Link href={`/water-bodies/stations/${r.stationId}`}>View station →</Link></div></Popup></CircleMarker>)}
      {layer === 'water-bodies' && filteredBodies.map((w) => <CircleMarker key={w.id} center={[w.latitude!, w.longitude!]} radius={7} pathOptions={{ color: '#0891b2', fillColor: '#cffafe', fillOpacity: .95, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker">Water body</span><strong>{w.nameEn}</strong><span>{titleCase(w.waterBodyType)} · {titleCase(w.hydrologicalClass)}</span><Link href={`/water-bodies/${w.id}`}>View water body →</Link></div></Popup></CircleMarker>)}
      {layer === 'stations' && filteredStations.map((s) => <CircleMarker key={s.id} center={[s.latitude!, s.longitude!]} radius={7} pathOptions={{ color: '#c2410c', fillColor: '#ffedd5', fillOpacity: .95, weight: 2 }}><Popup><div className="map-popup"><span className="popup-kicker">Water-level station</span><strong>{s.name}</strong><span>{s.riverName ?? 'River not specified'}</span><Link href={`/water-bodies/stations/${s.id}`}>View station →</Link></div></Popup></CircleMarker>)}
    </MapContainer></div>
    <aside className="map-selected-panel" aria-live="polite">{selected ? <><div className="selected-panel-header"><div><span className="popup-kicker">District</span><h2>{selected.name}</h2><p>{selected.division ? `${selected.division} Division` : 'Bangladesh'}</p></div><button type="button" className="panel-close" aria-label="Clear selected district" onClick={() => setSelectedId(null)}>×</button></div><div className="selected-stats"><div><span>Temperature</span><strong>{weatherById.get(selected.id)?.temperature2m != null ? `${weatherById.get(selected.id)!.temperature2m}°C` : 'Unavailable'}</strong></div><div><span>PM2.5</span><strong>{airById.get(selected.id)?.pm25 != null ? `${airById.get(selected.id)!.pm25} µg/m³` : 'Unavailable'}</strong></div><div><span>Active alerts</span><strong>{alerts.filter((a) => a.districtId === selected.id).length}</strong></div><div><span>Verified reports</span><strong>{reports.filter((r) => r.districtName === selected.name).length}</strong></div></div><Link className="button" href={`/locations/districts/${selected.id}`}>View district profile</Link></> : <><span className="popup-kicker">{layerLabel}</span><h2>Explore environmental signals</h2><p>Select a district or marker to inspect the latest available information.</p></>}</aside>
    <div className="map-freshness">{layer === 'weather' || layer === 'air-quality' ? 'Source: Open-Meteo · Observed readings' : layer === 'reports' ? 'Source: Delta Signal verified reports' : layer === 'alerts' ? 'Source: Delta Signal operational alerts' : 'Source: Delta Signal water registry'}{!isLive && ' · Some data unavailable'}</div>
  </div>;
}

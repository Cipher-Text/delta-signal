'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useState } from 'react';

// Bangladesh bounding box — ensures the map always opens showing the full country
const BD_BOUNDS: [[number, number], [number, number]] = [
  [20.3, 87.8],
  [26.8, 92.8],
];

// Fallback centre used for nationwide alerts (no district pinned)
const BD_CENTER: [number, number] = [23.7, 90.4];

const SEVERITY_COLOR: Record<string, string> = {
  INFO: 'var(--map-alert-info)',
  WATCH: 'var(--map-alert-watch)',
  WARNING: 'var(--map-alert-warning)',
  EMERGENCY: 'var(--map-alert-critical)',
};

const SEVERITY_RADIUS: Record<string, number> = {
  INFO: 10,
  WATCH: 12,
  WARNING: 14,
  EMERGENCY: 18,
};

export interface MapDistrict {
  id: string;
  name: string;
  lat: number;
  lng: number;
  division?: string;
}

export interface MapAlert {
  id: string;
  title: string;
  severity: string;
  districtId: string | null;
  districtName: string | null;
}

export interface MapReport {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  districtName: string | null;
}

interface Props {
  districts: MapDistrict[];
  alerts: MapAlert[];
  reports: MapReport[];
  isLive: boolean;
  compact?: boolean;
}

export type MapLayer = 'alerts' | 'flood' | 'weather' | 'air-quality' | 'reports' | 'water-bodies' | 'stations';

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MapClient({ districts, alerts, reports, isLive }: Props) {
  const districtById = new Map(districts.map((d) => [d.id, d]));
  const [visibleLayers, setVisibleLayers] = useState({
    districts: true,
    alerts: true,
    reports: true,
  });

  function toggleLayer(layer: keyof typeof visibleLayers) {
    setVisibleLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  return (
    <div className="map-client">
      <div className="map-layer-controls" aria-label="Map layers">
        <span className="map-layer-label">Show on map</span>
        {([
          ['districts', 'Districts'],
          ['alerts', 'Active alerts'],
          ['reports', 'Verified reports'],
        ] as const).map(([layer, label]) => (
          <button
            key={layer}
            type="button"
            className={`map-layer-toggle${visibleLayers[layer] ? ' is-active' : ''}`}
            aria-pressed={visibleLayers[layer]}
            onClick={() => toggleLayer(layer)}
          >
            <span aria-hidden="true" className="map-layer-toggle-dot" />
            {label}
          </button>
        ))}
      </div>

      <MapContainer
        bounds={BD_BOUNDS}
        boundsOptions={{ padding: [8, 8] }}
        style={{ height: '100%', width: '100%', minHeight: '100%', borderRadius: 8 }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

      {visibleLayers.districts && districts.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lng]}
          radius={4}
          pathOptions={{ color: '#9db5a8', fillColor: '#9db5a8', fillOpacity: 0.5, weight: 1 }}
        >
          <Popup>
            <strong>{d.name}</strong>
          </Popup>
        </CircleMarker>
      ))}

      {visibleLayers.alerts && alerts.map((alert) => {
        const district = alert.districtId ? districtById.get(alert.districtId) : null;
        const center: [number, number] = district
          ? [district.lat, district.lng]
          : BD_CENTER;
        const color = SEVERITY_COLOR[alert.severity] ?? 'var(--map-alert-unknown)';
        const radius = SEVERITY_RADIUS[alert.severity] ?? 12;

        return (
          <CircleMarker
            key={alert.id}
            center={center}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color,
                    marginBottom: 4,
                  }}
                >
                  {alert.severity} ALERT
                </div>
                <strong style={{ fontSize: 13 }}>{alert.title}</strong>
                {alert.districtName && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                    {alert.districtName}
                  </div>
                )}
                {!alert.districtId && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                    Nationwide
                  </div>
                )}
                <a href={`/alerts/${alert.id}`} style={{ display: 'inline-block', marginTop: 8, color, fontWeight: 700 }}>
                  View alert details →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {visibleLayers.reports && reports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.lat, report.lng]}
          radius={7}
          pathOptions={{
            color: 'var(--primary)',
            fillColor: 'var(--primary)',
            fillOpacity: 0.75,
            weight: 1.5,
          }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  marginBottom: 4,
                }}
              >
                {titleCase(report.category)}
              </div>
              <strong style={{ fontSize: 13 }}>{report.title}</strong>
              {report.districtName && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                  {report.districtName}
                </div>
              )}
              <a href={`/reports/${report.id}`} style={{ display: 'inline-block', marginTop: 8, color: 'var(--primary)', fontWeight: 700 }}>
                View report details →
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      </MapContainer>
      {!isLive && (
        <div className="map-data-state" role="status">
          <strong>Map data is temporarily unavailable.</strong>
          <span>We could not retrieve district, alert, or report locations.</span>
        </div>
      )}
      {isLive && districts.length === 0 && alerts.length === 0 && reports.length === 0 && (
        <div className="map-data-state" role="status">
          <strong>No mapped records right now.</strong>
          <span>Verified reports and active alerts appear here when they have a mapped location.</span>
        </div>
      )}
      <p className="map-mobile-hint">Use the +/− controls to zoom. Turn layers off to reduce overlap.</p>
    </div>
  );
}

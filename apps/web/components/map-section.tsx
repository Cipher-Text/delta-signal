import dynamic from 'next/dynamic';
import Link from 'next/link';
import { routes, type Alert, type CitizenReport } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import type { MapDistrict, MapAlert, MapReport } from './map-client';

// Leaflet requires browser APIs — must load with ssr: false
const MapClient = dynamic(() => import('./map-client'), {
  ssr: false,
  loading: () => (
    <div className="map-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
      Loading map…
    </div>
  ),
});

// ── Types for the district API response (includes lat/lng, not in DistrictSummary) ──

interface DistrictRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface PaginatedAlerts {
  data: Alert[];
}

interface PaginatedReports {
  data: CitizenReport[];
}

// ── Map data ──

async function loadMapData(): Promise<{
  districts: MapDistrict[];
  alerts: MapAlert[];
  reports: MapReport[];
  isLive: boolean;
}> {
  const [districtResult, alertResult, reportResult] = await Promise.allSettled([
      apiGet<DistrictRow[]>(routes.locations.districts),
      apiGet<PaginatedAlerts>(`${routes.alerts.list}?status=ACTIVE&pageSize=50`),
      apiGet<PaginatedReports>(`${routes.reports.list}?status=VERIFIED&pageSize=50`),
  ]);

  const districtRows = districtResult.status === 'fulfilled' ? districtResult.value : [];
  const alertRes = alertResult.status === 'fulfilled' ? alertResult.value : { data: [] };
  const reportRes = reportResult.status === 'fulfilled' ? reportResult.value : { data: [] };

    const districts: MapDistrict[] = districtRows
      .filter((d): d is DistrictRow & { lat: number; lng: number } => d.lat != null && d.lng != null)
      .map((d) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng }));

    const districtById = new Map(districts.map((d) => [d.id, d]));

    const alerts: MapAlert[] = alertRes.data.map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      districtId: a.district?.id ?? null,
      districtName: a.district?.name ?? null,
    }));

    const reports: MapReport[] = reportRes.data
      .filter((r) => {
        if (r.lat != null && r.lng != null) return true;
        if (r.districtId && districtById.has(r.districtId)) return true;
        return false;
      })
      .map((r) => {
        const fallbackDistrict = r.districtId ? districtById.get(r.districtId) : undefined;
        return {
          id: r.id,
          title: r.title,
          category: r.category,
          lat: r.lat ?? fallbackDistrict!.lat,
          lng: r.lng ?? fallbackDistrict!.lng,
          districtName: r.district?.name ?? null,
        };
      });

  return {
    districts,
    alerts,
    reports,
    isLive: districtResult.status === 'fulfilled' || alertResult.status === 'fulfilled' || reportResult.status === 'fulfilled',
  };
}

// ── Component ──

export default async function MapSection() {
  const { districts, alerts, reports, isLive: mapIsLive } = await loadMapData();

  return (
    <section
      id="map"
      className="content-grid public-section"
      aria-label="Environmental map"
    >
      {/* ── Map panel ── */}
      <article className="panel map-preview-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Environmental map</p>
            <h2>See what’s happening across Bangladesh</h2>
            <p>
              A live snapshot of active alerts, verified reports, and district coverage. Select a marker for a quick look.
            </p>
          </div>
        </div>

        <div className="map-canvas" style={{ padding: 0, overflow: 'hidden' }}>
          <MapClient districts={districts} alerts={alerts} reports={reports} isLive={mapIsLive} compact />
        </div>

        <div className="map-preview-footer">
          <div className="map-legend" aria-label="Map legend">
            <span className="legend-item legend-alert-emergency">Emergency</span>
            <span className="legend-item legend-alert-warning">Warning</span>
            <span className="legend-item legend-report">Verified report</span>
          </div>
          <Link className="button" href="/map">Explore full map <span aria-hidden="true">→</span></Link>
        </div>
      </article>
    </section>
  );
}

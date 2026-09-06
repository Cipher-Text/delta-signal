import Link from 'next/link';
import { routes, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGet } from '../lib/api';
import { relativeTime } from '../lib/format';

export default async function EmergencyBanner() {
  let emergencyAlerts: Alert[] = [];
  try {
    const res = await apiGet<PaginatedEnvelope<Alert>>(
      `${routes.alerts.list}?status=ACTIVE&severity=EMERGENCY&pageSize=3`,
    );
    emergencyAlerts = res.data;
  } catch {
    return null;
  }

  if (emergencyAlerts.length === 0) return null;

  return (
    <div className="emergency-banner" role="alert" aria-live="assertive">
      <span className="emergency-banner-label">EMERGENCY</span>
      <div className="emergency-banner-items">
        {emergencyAlerts.map((a) => (
          <span key={a.id} className="emergency-banner-item">
            <strong>{a.title}</strong>
            {a.district && <span> · {a.district.name}</span>}
            <span> · {relativeTime(a.issuedAt)}</span>
          </span>
        ))}
      </div>
      <Link href="/alerts" className="emergency-banner-link">
        View all alerts →
      </Link>
    </div>
  );
}

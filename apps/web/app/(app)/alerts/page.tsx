import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import {
  routes,
  type Alert,
  type DistrictSummary,
  type PaginatedEnvelope,
} from '@delta-signal/contracts';
import { dhakaDateTimeShort, titleCase } from '../../../lib/format';
import {
  ALERT_TYPES,
  SEVERITIES,
  SEVERITY_LEVEL,
  canonicalDivision,
  hazardLabel,
} from '../../../lib/alerts';
import AlertDivisionMap, { type MapAlert } from '../../../components/alert-division-map';
import AlertFilterSelects from '../../../components/alert-filter-selects';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';
import StatusBadge from '../../../components/status-badge';

// Alerts are safety-critical: keep the cache short so new and cancelled alerts show within a minute.
const ALERTS_REVALIDATE_SECONDS = 60;
const PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 10;
const ACTIVE_FETCH_LIMIT = 100;

type Query = { severity?: string; alertType?: string; districtId?: string; page?: string; historyPage?: string };

export default async function AlertsPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  const severity = (SEVERITIES as readonly string[]).includes(sp.severity ?? '') ? sp.severity : undefined;
  const { alertType, districtId } = sp;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(sp.historyPage ?? 1) || 1);

  // Active alerts for the hazard/district scope. Severity counts and the severity
  // filter are derived from this one set, so the tab counts always match the list.
  const scope = new URLSearchParams({ page: '1', pageSize: String(ACTIVE_FETCH_LIMIT) });
  if (alertType) scope.set('alertType', alertType);
  if (districtId) scope.set('districtId', districtId);

  const [scopeRes, historyRes, districts] = await Promise.all([
    apiGet<PaginatedEnvelope<Alert>>(`${routes.alerts.list}?${scope}`, ALERTS_REVALIDATE_SECONDS),
    apiGet<PaginatedEnvelope<Alert>>(
      `${routes.alerts.list}?status=EXPIRED&page=${historyPage}&pageSize=${HISTORY_PAGE_SIZE}`,
      ALERTS_REVALIDATE_SECONDS,
    ),
    apiGet<DistrictSummary[]>(routes.locations.districts),
  ]);

  const divisionByDistrict = new Map(districts.map((d) => [d.id, d.division?.name]));
  const districtName = districts.find((d) => d.id === districtId)?.name;

  const inScope = scopeRes.data;
  const counts: Record<string, number> = Object.fromEntries(
    SEVERITIES.map((s) => [s, inScope.filter((a) => a.severity === s).length]),
  );
  const list = severity ? inScope.filter((a) => a.severity === severity) : inScope;
  const pageItems = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Divisions (canonical names) an alert covers: its primary district plus any extra areas.
  const divisionsOf = (a: Alert): string[] => {
    const names = new Set<string>();
    if (a.district?.division?.name) names.add(canonicalDivision(a.district.division.name));
    else if (a.district) {
      const d = divisionByDistrict.get(a.district.id);
      if (d) names.add(canonicalDivision(d));
    }
    for (const area of a.areas ?? []) {
      const d = area.district ? divisionByDistrict.get(area.district.id) : undefined;
      if (d) names.add(canonicalDivision(d));
    }
    return [...names];
  };
  const mapAlerts: MapAlert[] = list.map((a) => ({ severity: a.severity, divisions: divisionsOf(a) }));

  const placeOf = (a: Alert): string => {
    if (a.district) {
      const division = a.district.division?.name ?? divisionByDistrict.get(a.district.id);
      return division ? `${a.district.name} · ${canonicalDivision(division)} division` : a.district.name;
    }
    const names = (a.areas ?? []).map((x) => x.district?.name).filter(Boolean) as string[];
    return names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : 'Nationwide';
  };

  // Link to this page with some filters overridden; undefined removes a filter.
  const href = (o: Partial<Record<'severity' | 'alertType' | 'districtId', string | undefined>>) => {
    const next = { severity, alertType, districtId, ...o };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/alerts${qs ? `?${qs}` : ''}`;
  };

  const chips = [
    severity && { key: 'severity', label: `Severity: ${titleCase(severity)}`, remove: href({ severity: undefined }) },
    alertType && { key: 'alertType', label: `Hazard: ${hazardLabel(alertType)}`, remove: href({ alertType: undefined }) },
    districtId && { key: 'districtId', label: `District: ${districtName ?? districtId}`, remove: href({ districtId: undefined }) },
  ].filter(Boolean) as { key: string; label: string; remove: string }[];

  const countLabel = `${list.length.toLocaleString()} active ${list.length === 1 ? 'alert' : 'alerts'}`;

  return (
    <>
      <PageHeader title="Alerts" description="Active environmental alerts for Bangladesh. Times shown in BST (UTC+6)." />

      <section className="alerts-filter-card" aria-label="Filters">
        <div className="alerts-filter-row">
          <nav className="alerts-seg" aria-label="Severity">
            <Link href={href({ severity: undefined })} aria-current={!severity ? 'true' : undefined}>
              All <span>{inScope.length}</span>
            </Link>
            {SEVERITIES.map((s) => (
              <Link key={s} href={href({ severity: s })} aria-current={severity === s ? 'true' : undefined}>
                <i className={`alerts-dot alerts-dot--${SEVERITY_LEVEL[s]}`} aria-hidden="true" />
                {titleCase(s)} <span>{counts[s]}</span>
              </Link>
            ))}
          </nav>
          <AlertFilterSelects
            severity={severity}
            hazard={alertType}
            districtId={districtId}
            hazards={ALERT_TYPES.map((t) => ({ value: t, label: hazardLabel(t) }))}
            districts={districts.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>

        {chips.length > 0 && (
          <div className="alerts-chips">
            <span>Filtered by</span>
            {chips.map((c) => (
              <Link key={c.key} className="alerts-chip" href={c.remove} aria-label={`Remove filter ${c.label}`}>
                {c.label}
                <NavIcon name="close" />
              </Link>
            ))}
            <Link className="alerts-clear" href="/alerts">Clear all</Link>
          </div>
        )}
      </section>

      <div className="alerts-layout">
        <section className="alerts-main" aria-labelledby="alerts-active-heading">
          <div className="alerts-main-head">
            <h2 id="alerts-active-heading">{countLabel}</h2>
            <span>
              <span className="alerts-cap-long">Most severe first, then newest issued</span>
              <span className="alerts-cap-short">Most severe first</span>
            </span>
          </div>

          {pageItems.map((a) => {
            const level = SEVERITY_LEVEL[a.severity] ?? 'unknown';
            return (
              <article key={a.id} className={`alert-item alert-item--${level}`}>
                <div className="alert-item-top">
                  <StatusBadge level={level}>{titleCase(a.severity)}</StatusBadge>
                  <span className="alert-item-hazard">{hazardLabel(a.alertType)}</span>
                  <span className="alert-item-place">
                    <NavIcon name="locations" />
                    {placeOf(a)}
                  </span>
                </div>
                <div className="alert-item-body">
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                </div>
                {a.instructions && (
                  <div className="alert-item-todo"><b>What to do:</b> {a.instructions}</div>
                )}
                <div className="alert-item-foot">
                  <span>Issued {dhakaDateTimeShort(a.issuedAt)}</span>
                  <span>{a.expiresAt ? `Expires ${dhakaDateTimeShort(a.expiresAt)}` : 'No expiry set'}</span>
                  <Link href={`/alerts/${a.id}`}>Details and subscribe →</Link>
                </div>
              </article>
            );
          })}

          {list.length === 0 && (
            chips.length > 0 ? (
              <EmptyState
                title="No active alerts match these filters"
                description="Try a different severity, hazard or district."
                action={<Link className="button" href="/alerts">Clear filters</Link>}
              />
            ) : (
              <EmptyState
                variant="healthy"
                title="No active alerts"
                description="Bangladesh environmental feeds currently show no active platform alerts."
                lastChecked={dhakaDateTimeShort(new Date().toISOString()) + ' BST (UTC+6)'}
              />
            )
          )}

          <ListPagination
            pathname="/alerts"
            page={page}
            pageSize={PAGE_SIZE}
            total={list.length}
            query={{ severity, alertType, districtId, historyPage: historyPage > 1 ? String(historyPage) : undefined }}
          />

          {historyRes.data.length === 0 ? (
            <div className="alerts-history-note">
              <NavIcon name="clock" />
              <span><b>Alert history:</b> no expired alerts yet. Expired alerts will be listed here.</span>
            </div>
          ) : (
            <article className="panel alerts-history">
              <div className="panel-header">
                <div>
                  <h2>Alert history</h2>
                  <p>Expired alerts</p>
                </div>
              </div>
              <div className="table" role="table" aria-label="Alert history">
                <div className="table-row table-head" role="row">
                  <span>Alert</span>
                  <span>Area</span>
                  <span>Severity</span>
                  <span>Status</span>
                </div>
                {historyRes.data.map((a) => (
                  <Link className="table-row table-row-link" role="row" key={a.id} href={`/alerts/${a.id}`}>
                    <strong>{a.title}</strong>
                    <span>{placeOf(a)}</span>
                    <span><StatusBadge level={SEVERITY_LEVEL[a.severity] ?? 'unknown'}>{titleCase(a.severity)}</StatusBadge></span>
                    <span className="tag muted">{titleCase(a.status)}</span>
                  </Link>
                ))}
              </div>
              <ListPagination
                pathname="/alerts"
                page={historyRes.page}
                pageSize={HISTORY_PAGE_SIZE}
                total={historyRes.total}
                query={{ severity, alertType, districtId, page: page > 1 ? String(page) : undefined }}
                pageParam="historyPage"
              />
            </article>
          )}
        </section>

        <aside className="alerts-aside">
          <AlertDivisionMap alerts={mapAlerts} />

          <section className="alerts-card" aria-labelledby="alerts-sub-heading">
            <h2 id="alerts-sub-heading">Get alert emails</h2>
            <p>Choose nationwide or district alerts and the minimum severity you want to hear about.</p>
            <Link className="alerts-btn" href="/profile?tab=alerts">Manage in your profile</Link>
          </section>

          <section className="alerts-scale" aria-labelledby="alerts-scale-heading">
            <h2 id="alerts-scale-heading">Severity scale</h2>
            <ul>
              <li><i className="alerts-dot alerts-dot--critical" aria-hidden="true" /><b>Emergency</b> act now</li>
              <li><i className="alerts-dot alerts-dot--warning" aria-hidden="true" /><b>Warning</b> conditions likely to cause harm</li>
              <li><i className="alerts-dot alerts-dot--watch" aria-hidden="true" /><b>Watch</b> above normal, stay informed</li>
              <li><i className="alerts-dot alerts-dot--info" aria-hidden="true" /><b>Info</b> notice, no action needed</li>
            </ul>
            <Link href="/methodology">How alerts are classified →</Link>
          </section>
        </aside>
      </div>
    </>
  );
}

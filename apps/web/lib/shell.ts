import { routes, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGet } from './api';
import { getTheme } from './theme';
import { getSidebarCollapsed } from './sidebar';
import type { TopBarAlerts } from '../components/top-bar';

const BELL_ALERT_COUNT = 5;

/** Active alerts for the top-bar bell. The shell must never fail because alerts did. */
async function getBellAlerts(): Promise<TopBarAlerts> {
  try {
    const res = await apiGet<PaginatedEnvelope<Alert>>(
      `${routes.alerts.list}?page=1&pageSize=${BELL_ALERT_COUNT}`,
      60,
    );
    return {
      total: res.total,
      items: res.data.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        area: a.district?.name ?? 'Nationwide',
      })),
    };
  } catch {
    return { total: 0, items: [] };
  }
}

/** Everything the workspace shell needs besides the user; shared by every layout that renders it. */
export async function loadShellProps() {
  const [theme, initialCollapsed, alerts] = await Promise.all([getTheme(), getSidebarCollapsed(), getBellAlerts()]);
  return { theme, initialCollapsed, alerts };
}

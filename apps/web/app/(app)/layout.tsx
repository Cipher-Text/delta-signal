import { routes, type Alert, type PaginatedEnvelope } from '@delta-signal/contracts';
import { apiGet } from '../../lib/api';
import { requireUser } from '../../lib/current-user';
import { getTheme } from '../../lib/theme';
import { getSidebarCollapsed } from '../../lib/sidebar';
import AppShell from '../../components/app-shell';
import type { TopBarAlerts } from '../../components/top-bar';

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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware only checks token expiry; this validates the session against the API,
  // so every (app) route is signed-in-only even with a forged or revoked cookie.
  const [user, theme, collapsed, alerts] = await Promise.all([
    requireUser(),
    getTheme(),
    getSidebarCollapsed(),
    getBellAlerts(),
  ]);
  return (
    <AppShell user={user} theme={theme} initialCollapsed={collapsed} alerts={alerts}>
      {children}
    </AppShell>
  );
}

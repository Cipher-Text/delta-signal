import { requireUser } from '../../lib/current-user';
import { getTheme } from '../../lib/theme';
import { getSidebarCollapsed } from '../../lib/sidebar';
import AppShell from '../../components/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware only checks token expiry; this validates the session against the API,
  // so every (app) route is signed-in-only even with a forged or revoked cookie.
  const [user, theme, collapsed] = await Promise.all([requireUser(), getTheme(), getSidebarCollapsed()]);
  return (
    <AppShell user={user} theme={theme} initialCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}

import { requireUser } from '../../lib/current-user';
import { getTheme } from '../../lib/theme';
import AppSidebar from '../../components/app-sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware only checks token expiry; this validates the session against the API,
  // so every (app) route is signed-in-only even with a forged or revoked cookie.
  const [user, theme] = await Promise.all([requireUser(), getTheme()]);
  return (
    <div className="app-shell">
      <AppSidebar user={user} theme={theme} />
      <main className="main">{children}</main>
    </div>
  );
}

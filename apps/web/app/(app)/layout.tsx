import { requireUser } from '../../lib/current-user';
import { loadShellProps } from '../../lib/shell';
import AppShell from '../../components/app-shell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware only checks token expiry; this validates the session against the API,
  // so every (app) route is signed-in-only even with a forged or revoked cookie.
  const [user, shell] = await Promise.all([requireUser(), loadShellProps()]);
  return (
    <AppShell user={user} {...shell}>
      {children}
    </AppShell>
  );
}

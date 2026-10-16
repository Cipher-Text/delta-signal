import { getCurrentUser } from '../../lib/current-user';
import { loadShellProps } from '../../lib/shell';
import AppShell from '../../components/app-shell';
import PublicNav from '../../components/public-nav';
import PublicFooter from '../../components/public-footer';

/**
 * Adaptive frame for pages that guests may read: one URL, one set of content, framed by who is viewing.
 * Signed-in users stay inside the workspace shell (sidebar, top bar); guests get the public nav and footer.
 * The session is validated against the API, so a forged or revoked cookie falls back to the public frame.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    const shell = await loadShellProps();
    return (
      <AppShell user={user} {...shell}>
        <div className="site-frame site-frame--workspace">{children}</div>
      </AppShell>
    );
  }

  return (
    <div className="public-shell">
      <PublicNav />
      <main className="site-frame site-frame--public">{children}</main>
      <PublicFooter />
    </div>
  );
}

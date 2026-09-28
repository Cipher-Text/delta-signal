import { getCurrentUser } from '../../lib/current-user';
import { getTheme } from '../../lib/theme';
import AppSidebar from '../../components/app-sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, theme] = await Promise.all([getCurrentUser(), getTheme()]);
  return (
    <div className="app-shell">
      <AppSidebar user={user} theme={theme} />
      <main className="main">{children}</main>
    </div>
  );
}

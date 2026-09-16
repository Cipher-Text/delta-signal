import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/current-user';
import { apiGetAuthed } from '../../../lib/api';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  routes,
  type AdminDashboard,
  type ModeratorDashboard,
  type GovernmentDashboard,
  type ResearcherDashboard,
  type OrgAdminDashboard,
} from '@delta-signal/contracts';
import AdminDashboardView from './views/AdminDashboardView';
import ModeratorDashboardView from './views/ModeratorDashboardView';
import GovernmentDashboardView from './views/GovernmentDashboardView';
import ResearcherDashboardView from './views/ResearcherDashboardView';
import OrgAdminDashboardView from './views/OrgAdminDashboardView';

const DASHBOARD_ROLES = new Set([
  'ADMIN',
  'MODERATOR',
  'GOVERNMENT',
  'RESEARCHER',
  'ORGANIZATION_ADMIN',
]);

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!DASHBOARD_ROLES.has(user.role)) {
    // Citizens and guests don't have a dashboard yet
    return (
      <div className="empty-state" style={{ padding: '48px 0' }}>
        <strong>Dashboard not available</strong>
        <p>Dashboards are available for researchers, government officials, and administrators.</p>
      </div>
    );
  }

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  if (user.role === 'ADMIN') {
    const data = await apiGetAuthed<AdminDashboard>(routes.analytics.admin, accessToken);
    return <AdminDashboardView data={data} user={user} />;
  }

  if (user.role === 'MODERATOR') {
    const data = await apiGetAuthed<ModeratorDashboard>(routes.analytics.moderator, accessToken);
    return <ModeratorDashboardView data={data} user={user} />;
  }

  if (user.role === 'GOVERNMENT') {
    const data = await apiGetAuthed<GovernmentDashboard>(routes.analytics.government, accessToken);
    return <GovernmentDashboardView data={data} user={user} />;
  }

  if (user.role === 'RESEARCHER') {
    const data = await apiGetAuthed<ResearcherDashboard>(routes.analytics.researcher, accessToken);
    return <ResearcherDashboardView data={data} user={user} />;
  }

  // ORGANIZATION_ADMIN
  const data = await apiGetAuthed<OrgAdminDashboard>(routes.analytics.orgadmin, accessToken);
  return <OrgAdminDashboardView data={data} user={user} />;
}

import { cookies } from 'next/headers';
import Link from 'next/link';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { apiGet } from '../../../lib/api';
import { reviewResearcherApplicationAction } from '../../../lib/user-actions';

type Status = 'PENDING' | 'NEEDS_INFORMATION' | 'APPROVED' | 'DECLINED';
interface Application {
  id: string; status: Status; reviewerNote: string | null; createdAt: string;
  user: { id: string; email: string; displayName: string; role: string; isEmailVerified: boolean; socialLinks: Array<{ platform: string; url: string }> };
}
interface Result { data: Application[]; total: number; page: number; pageSize: number }
const STATUSES: Array<{ value: Status; label: string }> = [
  { value: 'PENDING', label: 'Pending' }, { value: 'NEEDS_INFORMATION', label: 'Needs information' },
  { value: 'APPROVED', label: 'Approved' }, { value: 'DECLINED', label: 'Declined' },
];
const PROFILE_LABEL: Record<string, string> = { googleScholar: 'Google Scholar', researchGate: 'ResearchGate', orcid: 'ORCID' };

export default async function ResearcherApplicationsPage(props: { searchParams: Promise<{ status?: string; error?: string; success?: string }> }) {
  const params = await props.searchParams;
  const status = (STATUSES.some((s) => s.value === params.status) ? params.status : 'PENDING') as Status;
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const query = new URLSearchParams({ page: '1', pageSize: '50', status });
  const result = await apiGet<Result>(`/api/v1/users/researcher-applications?${query}`, token);

  return <>
    <div className="page-header"><div><h1>Researcher applications</h1><p>{result.total} {status.toLowerCase().replace('_', ' ')} application{result.total === 1 ? '' : 's'}</p></div></div>
    {params.error && <div className="flash flash-error" role="alert">{params.error}</div>}
    {params.success && <div className="flash flash-success" role="status">Application marked {params.success.toLowerCase().replace('_', ' ')}.</div>}
    <nav className="filter-bar" aria-label="Filter applications by status">
      {STATUSES.map((item) => <Link key={item.value} href={`/researcher-applications?status=${item.value}`} className={`btn ${status === item.value ? 'btn-secondary' : 'btn-ghost'}`}>{item.label}</Link>)}
    </nav>
    {result.data.length === 0 ? <div className="empty-state">No {status.toLowerCase().replace('_', ' ')} applications.</div> :
      <div className="table-wrapper">
        {result.data.map((app) => <article key={app.id} className="user-row">
          <div className="user-row-main"><div className="user-identity">
            <div className="user-name-row"><strong className="user-name">{app.user.displayName}</strong><span className={`role-badge ${app.user.isEmailVerified ? 'role-researcher' : 'role-citizen'}`}>{app.user.isEmailVerified ? 'Email verified' : 'Email not verified'}</span></div>
            <div className="user-email"><a href={`mailto:${app.user.email}`}>{app.user.email}</a></div>
            <div className="user-meta">Applied {new Date(app.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <h3>Research profiles</h3>
            {app.user.socialLinks.length > 0 ? <ul>{app.user.socialLinks.map((link) => <li key={link.platform}><a href={/^https?:\/\//i.test(link.url) ? link.url : undefined} target="_blank" rel="noreferrer">{PROFILE_LABEL[link.platform] ?? link.platform} ↗</a></li>)}</ul> : <p>No research profile link is currently saved.</p>}
            {app.reviewerNote && <p><strong>Previous reviewer message:</strong> {app.reviewerNote}</p>}
          </div>
          {['PENDING', 'NEEDS_INFORMATION'].includes(app.status) && <div className="user-actions">
            <form action={reviewResearcherApplicationAction} className="role-form">
              <input type="hidden" name="id" value={app.id} /><input type="hidden" name="returnStatus" value={status} />
              <label className="application-note-label">Reviewer message <textarea name="reviewerNote" rows={3} maxLength={2000} placeholder="Required when requesting more information or declining" defaultValue={app.reviewerNote ?? ''} /></label>
              <div className="application-review-actions">
                <button name="status" value="NEEDS_INFORMATION" className="btn btn-secondary btn-sm">Request information</button>
                <button name="status" value="DECLINED" className="btn btn-danger-outline btn-sm">Decline</button>
                <button name="status" value="APPROVED" className="btn btn-primary btn-sm">Approve researcher</button>
              </div>
            </form>
          </div>}
        </div></article>)}
      </div>}
  </>;
}

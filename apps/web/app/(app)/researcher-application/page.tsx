import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes, type ResearcherApplication } from '@delta-signal/contracts';
import PageHeader from '../../../components/page-header';
import { getCurrentUser } from '../../../lib/current-user';
import { apiGetAuthed } from '../../../lib/api';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { submitResearcherApplicationAction } from '../../../lib/researcher-application-actions';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Under review', NEEDS_INFORMATION: 'More information requested', APPROVED: 'Approved', DECLINED: 'Not approved' };
const STATUS_VARIANT: Record<string, string> = { PENDING: 'info', NEEDS_INFORMATION: 'warning', APPROVED: 'success', DECLINED: 'danger' };
const PROFILE_PLATFORMS = ['googleScholar', 'researchGate', 'orcid'];
const PLATFORM_LABEL: Record<string, string> = { googleScholar: 'Google Scholar', researchGate: 'ResearchGate', orcid: 'ORCID' };

export default async function ResearcherApplicationPage(props: { searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const params = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  const application = await apiGetAuthed<ResearcherApplication | null>(routes.researcherApplications.mine, token).catch(() => null);
  if (user.role === 'RESEARCHER' && application?.status !== 'APPROVED') redirect('/dashboard');
  if (user.role !== 'CITIZEN' && user.role !== 'RESEARCHER') redirect('/profile');
  const canApply = user.role === 'CITIZEN' && (!application || ['NEEDS_INFORMATION', 'DECLINED'].includes(application.status));
  const researchProfiles = user.socialLinks.filter((link) => PROFILE_PLATFORMS.includes(link.platform) && /^https?:\/\//i.test(link.url));

  return (
    <div className="page-stack researcher-access-page">
      <PageHeader
        eyebrow="Researcher access"
        title={user.role === 'RESEARCHER' ? 'Researcher access' : 'Apply to become a researcher'}
        description={user.role === 'RESEARCHER' ? 'Your researcher access is active.' : 'Link a research profile to your account, then send a one-click request for admin review. No publication details are required.'}
      />

      {params.error && <div className="flash flash-error" role="alert">{params.error}</div>}
      {params.submitted && <div className="flash flash-success" role="status">Your request was sent. Your account remains a citizen account while it is reviewed.</div>}

      {application && (
        <section className="panel researcher-application-status" aria-labelledby="application-status-heading">
          <div className="researcher-status-heading">
            <div>
              <p className="eyebrow">Your request</p>
              <h2 id="application-status-heading">Researcher access</h2>
            </div>
            <span className={`tag ${STATUS_VARIANT[application.status] ?? 'muted'}`}>
              {STATUS_LABEL[application.status] ?? application.status}
            </span>
          </div>
          <p className="researcher-status-date">Submitted {new Date(application.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          {application.status === 'PENDING' && !params.submitted && <p className="researcher-status-message">We’ll review the research profile links on your account. You can continue using Delta Signal as a citizen while you wait.</p>}
          {application.status === 'NEEDS_INFORMATION' && application.reviewerNote && (
            <div className="alert-strip warning researcher-review-note"><div><strong>More information requested</strong><p>{application.reviewerNote}</p></div></div>
          )}
          {application.status === 'DECLINED' && application.reviewerNote && (
            <div className="alert-strip info researcher-review-note"><div><strong>Reviewer message</strong><p>{application.reviewerNote}</p></div></div>
          )}
          {application.status === 'APPROVED' && <p className="researcher-status-message">Your account has researcher access. <Link className="text-link" href="/dashboard">Go to your dashboard</Link>.</p>}
        </section>
      )}

      {canApply && (
        <section className="panel researcher-application-panel" aria-labelledby="application-action-heading">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{application ? 'Next step' : 'One step'}</p>
              <h2 id="application-action-heading">{application ? 'Resubmit your request' : 'Apply with your research profile'}</h2>
              <p>Our admins will open your public research profile and review it manually.</p>
            </div>
          </div>

          {researchProfiles.length > 0 ? (
            <>
              <div className="research-profile-summary">
                <h3>Profiles linked to your account</h3>
                <ul className="research-profile-list">
                  {researchProfiles.map((link) => (
                    <li key={link.platform}>
                      <a className="research-profile-link" href={link.url} target="_blank" rel="noreferrer">
                        <span>{PLATFORM_LABEL[link.platform] ?? link.platform}</span><span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="researcher-privacy-note">By applying, you ask Delta Signal admins to review these public links. Researcher-only tools stay locked until approval.</p>
              <div className="button-row researcher-application-actions">
                <form action={submitResearcherApplicationAction}>
                  <button className="button" type="submit">{application ? 'Resubmit application' : 'Apply for researcher access'}</button>
                </form>
                <Link className="button ghost" href="/profile?tab=personal">Edit profile links</Link>
              </div>
            </>
          ) : (
            <div className="researcher-profile-missing" role="status">
              <div>
                <h3>Add a research profile link to continue</h3>
                <p>Add at least one Google Scholar, ResearchGate, or ORCID link in your profile. Then return here to apply.</p>
              </div>
              <Link className="button" href="/profile?tab=personal">Add profile link</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

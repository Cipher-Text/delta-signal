import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { joinFromDetailAction } from '../../../../lib/restoration-actions';
import { routes, type RestorationProject } from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../../lib/format';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'success',
  COMPLETED: 'success',
  PLANNED:   'info',
  PAUSED:    'muted',
};

const CREATOR_ROLES = new Set(['ORGANIZATION_ADMIN', 'ADMIN']);

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function RestorationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { joined?: string; error?: string };
}) {
  const [project, user] = await Promise.all([
    apiGet<RestorationProject>(routes.restoration.project(params.id), 60).catch(() => null),
    getCurrentUser(),
  ]);

  if (!project) notFound();

  const canJoin = user !== null && !CREATOR_ROLES.has(user.role);
  const isActive = project.status === 'ACTIVE' || project.status === 'PLANNED';

  return (
    <>
      <Link className="back-link" href="/restoration">
        ← All projects
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className="tag">{titleCase(project.category)}</span>
          <span className={`tag ${STATUS_BADGE[project.status] ?? 'muted'}`}>
            {titleCase(project.status)}
          </span>
        </div>
        <h1>{project.title}</h1>
        <div className="report-detail-meta">
          {project.organization && <span>{project.organization.name}</span>}
          {project.district && (
            <span>{project.district.name}, {project.district.division?.name}</span>
          )}
          <span>Posted {relativeTime(project.createdAt)}</span>
        </div>
      </div>

      {searchParams.joined && (
        <p className="form-success">You&apos;ve joined this project.</p>
      )}
      {searchParams.error && (
        <p className="form-error">{searchParams.error}</p>
      )}

      <article className="panel">
        <h2>About this project</h2>
        <p className="report-description">{project.description}</p>
        {project.impactSummary && (
          <div className="report-summary">
            <strong>Impact summary</strong>
            <p>{project.impactSummary}</p>
          </div>
        )}
      </article>

      <article className="panel">
        <h2>Details</h2>
        <div className="obs-detail-grid">
          <div className="obs-detail-row">
            <span>Category</span>
            <strong>{titleCase(project.category)}</strong>
          </div>
          <div className="obs-detail-row">
            <span>Status</span>
            <strong>{titleCase(project.status)}</strong>
          </div>
          {project.organization && (
            <div className="obs-detail-row">
              <span>Organization</span>
              <strong>{project.organization.name}</strong>
            </div>
          )}
          {project.district && (
            <div className="obs-detail-row">
              <span>Location</span>
              <strong>{project.district.name}, {project.district.division?.name}</strong>
            </div>
          )}
          {formatDate(project.startDate) && (
            <div className="obs-detail-row">
              <span>Start date</span>
              <strong>{formatDate(project.startDate)}</strong>
            </div>
          )}
          {formatDate(project.endDate) && (
            <div className="obs-detail-row">
              <span>End date</span>
              <strong>{formatDate(project.endDate)}</strong>
            </div>
          )}
          <div className="obs-detail-row">
            <span>Participants</span>
            <strong>{project._count.participants}</strong>
          </div>
        </div>
      </article>

      {isActive && canJoin && (
        <div className="access-note">
          <strong>Get involved</strong>
          <span>Join this project to be counted as a participant.</span>
          <form action={joinFromDetailAction.bind(null, project.id)} style={{ marginTop: 10 }}>
            <button className="button" type="submit">
              Join project
            </button>
          </form>
        </div>
      )}
    </>
  );
}

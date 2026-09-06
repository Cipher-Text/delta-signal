import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/current-user';
import { routes, type CitizenReport, type ReportComment, type ReportMedia } from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../../lib/format';
import { addCommentAction } from '../../../../lib/report-actions';

interface ReportStatusEvent {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface ReportDetail extends CitizenReport {
  statusHistory: ReportStatusEvent[];
}

const STATUS_VARIANT: Record<string, string> = {
  VERIFIED:     'success',
  RESOLVED:     'success',
  REJECTED:     'danger',
  SUBMITTED:    'muted',
  UNDER_REVIEW: 'info',
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { commented?: string; error?: string };
}) {
  const [reportOrNull, commentsRaw, mediaRaw] = await Promise.all([
    apiGet<ReportDetail>(routes.reports.detail(params.id), 60).catch(() => null),
    apiGet<ReportComment[]>(routes.reports.comments(params.id), 60).catch((): ReportComment[] => []),
    apiGet<ReportMedia[]>(routes.reports.media(params.id), 60).catch((): ReportMedia[] => []),
  ]);

  if (!reportOrNull) notFound();

  const report = reportOrNull;
  const user = await getCurrentUser();
  const isPublic = report.status === 'VERIFIED' || report.status === 'RESOLVED';

  return (
    <>
      <Link className="back-link" href="/reports">
        ← All reports
      </Link>

      <div className="report-detail-header">
        <div className="report-detail-badges">
          <span className="tag">{titleCase(report.category)}</span>
          <span className={`tag ${STATUS_VARIANT[report.status] ?? 'muted'}`}>
            {titleCase(report.status)}
          </span>
        </div>
        <h1>{report.title}</h1>
        <div className="report-detail-meta">
          {report.reporter && <span>By {report.reporter.displayName}</span>}
          {report.district && (
            <span>
              {report.district.name}, {report.district.division?.name}
            </span>
          )}
          <span>{relativeTime(report.createdAt)}</span>
        </div>
      </div>

      {!isPublic && (
        <div className="alert-strip info" role="status">
          This report is pending moderator review and not yet publicly listed.
        </div>
      )}

      <article className="panel">
        <h2>Description</h2>
        <p className="report-description">{report.description}</p>
        {report.summary && (
          <div className="report-summary">
            <strong>Moderator summary</strong>
            <p>{report.summary}</p>
          </div>
        )}
      </article>

      {report.statusHistory.length > 0 && (
        <article className="panel">
          <h2>Status history</h2>
          <div className="status-trail">
            {report.statusHistory.map((event) => (
              <div key={event.id} className="status-trail-row">
                <span className={`tag ${STATUS_VARIANT[event.status] ?? 'muted'}`}>
                  {titleCase(event.status)}
                </span>
                {event.note && (
                  <span className="status-trail-note">{event.note}</span>
                )}
                <span className="status-trail-time">{relativeTime(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {mediaRaw.length > 0 && (
        <article className="panel">
          <h2>Attached media</h2>
          <div className="media-list">
            {mediaRaw.map((m) => (
              <div key={m.id} className="media-item">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="media-link"
                >
                  {m.caption ?? 'View attachment'}
                  {m.mimeType && <span className="media-meta"> — {m.mimeType}</span>}
                </a>
                <span className="media-uploader">
                  Uploaded by {m.uploadedBy.displayName}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="panel">
        <h2>
          Comments{' '}
          {commentsRaw.length > 0 && (
            <span className="comment-count">({commentsRaw.length})</span>
          )}
        </h2>

        {searchParams.commented && (
          <p className="form-success">Comment posted.</p>
        )}
        {searchParams.error && (
          <p className="form-error">{searchParams.error}</p>
        )}

        {commentsRaw.length === 0 ? (
          <p className="muted-text">No comments yet.</p>
        ) : (
          <div className="comment-list">
            {commentsRaw.map((c) => (
              <div key={c.id} className="comment-row">
                <div className="comment-header">
                  <strong>{c.author.displayName}</strong>
                  <span className="comment-time">{relativeTime(c.createdAt)}</span>
                </div>
                <p className="comment-body">{c.body}</p>
              </div>
            ))}
          </div>
        )}

        {user && (
          <div className="comment-form">
            <form action={addCommentAction.bind(null, params.id)} className="auth-form">
              <div className="field">
                <label htmlFor="body">Add a comment</label>
                <textarea
                  id="body"
                  name="body"
                  required
                  minLength={1}
                  maxLength={5000}
                  rows={3}
                  placeholder="Share additional observations or context…"
                />
              </div>
              <button className="button" type="submit">
                Post comment
              </button>
            </form>
          </div>
        )}
      </article>
    </>
  );
}

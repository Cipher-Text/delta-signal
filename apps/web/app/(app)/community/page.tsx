import Link from 'next/link';
import { apiGet } from '../../../lib/api';
import { getCurrentUser } from '../../../lib/current-user';
import { createPostAction } from '../../../lib/community-actions';
import { routes, type CommunityPostSummary, type PaginatedEnvelope } from '@delta-signal/contracts';
import { relativeTime } from '../../../lib/format';
import DistrictSelect, { type DistrictWithDivision } from '../../../components/district-select';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';

type CommunityTab = 'posts' | 'polls';

export default async function CommunityPage(
  props: {
    searchParams: Promise<{
      tab?: string;
      districtId?: string;
      page?: string;
      created?: string;
      deleted?: string;
      error?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const tab: CommunityTab =
    searchParams.tab === 'polls' ? 'polls' : 'posts';
  const districtId = searchParams.districtId;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const hasPoll = tab === 'polls' ? 'true' : 'false';
  const postsPath =
    `${routes.community.posts}?hasPoll=${hasPoll}&page=${page}&pageSize=20` +
    (districtId ? `&districtId=${districtId}` : '');

  const [postsRes, user, allDistricts] = await Promise.all([
    apiGet<PaginatedEnvelope<CommunityPostSummary>>(postsPath, 0).catch(
      (): PaginatedEnvelope<CommunityPostSummary> => ({ data: [], total: 0, page: 1, pageSize: 20 }),
    ),
    getCurrentUser(),
    apiGet<DistrictWithDivision[]>(routes.locations.districts, 3600).catch(() => []),
  ]);

  const districts: DistrictWithDivision[] = user ? allDistricts : [];
  const canCreatePoll = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <>
      <div className="panel-header">
        <div>
          <h1>Community</h1>
          <p>Posts, discussions, and polls from contributors across Bangladesh.</p>
        </div>
        {!user && (
          <Link href="/login" className="button">
            Sign in to post
          </Link>
        )}
      </div>

      {/* Tab nav */}
      <nav className="tab-nav" aria-label="Community sections">
        <Link
          href="/community?tab=posts"
          className={tab === 'posts' ? 'active' : ''}
          aria-current={tab === 'posts' ? 'page' : undefined}
        >
          Posts
        </Link>
        <Link
          href="/community?tab=polls"
          className={tab === 'polls' ? 'active' : ''}
          aria-current={tab === 'polls' ? 'page' : undefined}
        >
          Polls
        </Link>
      </nav>

      {searchParams.created && (
        <p className="form-success">
          {tab === 'polls' ? 'Poll created.' : 'Post created.'}
        </p>
      )}
      {searchParams.deleted && <p className="form-success">Deleted.</p>}
      {searchParams.error && (
        <p className="form-error">{decodeURIComponent(searchParams.error)}</p>
      )}

      {/* ── Posts tab ─────────────────────────────────────────────────── */}
      {tab === 'posts' && (
        <>
          {user && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Create a post</h2>
                  <p>Share an update, observation, or question with the community.</p>
                </div>
              </div>
              <form action={createPostAction} className="submit-form">
                <div className="field">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    minLength={3}
                    maxLength={300}
                    placeholder="e.g. New mangrove planting near Sundarbans"
                  />
                </div>
                <div className="field">
                  <label htmlFor="body">Body</label>
                  <textarea
                    id="body"
                    name="body"
                    required
                    minLength={10}
                    maxLength={10000}
                    rows={4}
                    placeholder="Share details, links, or observations…"
                  />
                </div>
                <div className="field">
                  <label htmlFor="districtId">District (optional)</label>
                  <DistrictSelect districts={districts} />
                </div>
                <button className="button" type="submit">Create post</button>
              </form>
            </article>
          )}

          <ListResultToolbar total={postsRes.total} label="posts" />

          <div className="table" role="table" aria-label="Community posts">
            <div className="table-row table-head" role="row">
              <span>Title</span>
              <span>Author</span>
              <span>District</span>
              <span>Comments</span>
              <span>Posted</span>
            </div>
            {postsRes.data.map((p) => (
              <Link
                key={p.id}
                className="table-row table-row-link"
                role="row"
                href={`/community/${p.id}`}
              >
                <strong>{p.title}</strong>
                <span>{p.author.displayName}</span>
                <span>{p.district?.name ?? '—'}</span>
                <span>
                  {p._count.comments} comment{p._count.comments !== 1 ? 's' : ''}
                </span>
                <span>{relativeTime(p.createdAt)}</span>
              </Link>
            ))}
            {postsRes.data.length === 0 && (
              <div className="empty-state">No posts yet. Be the first to post!</div>
            )}
          </div>

          <ListPagination
            pathname="/community"
            page={postsRes.page}
            pageSize={postsRes.pageSize}
            total={postsRes.total}
            query={{ tab: 'posts', districtId }}
          />
        </>
      )}

      {/* ── Polls tab ─────────────────────────────────────────────────── */}
      {tab === 'polls' && (
        <>
          {canCreatePoll && (
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Create a poll</h2>
                  <p>Ask the community a question and collect structured responses.</p>
                </div>
              </div>
              <form action={createPostAction} className="submit-form">
                <div className="field">
                  <label htmlFor="pollQuestion">Question *</label>
                  <input
                    id="pollQuestion"
                    name="pollQuestion"
                    type="text"
                    required
                    maxLength={500}
                    placeholder="e.g. How often do you observe plastic waste near waterways?"
                  />
                </div>

                {[0, 1, 2, 3].map((i) => (
                  <div className="field" key={i}>
                    <label htmlFor={`pollOption${i}`}>
                      Option {i + 1}{i < 2 ? ' *' : ' (optional)'}
                    </label>
                    <input
                      id={`pollOption${i}`}
                      name={`pollOption${i}`}
                      type="text"
                      maxLength={200}
                      placeholder={`Option ${i + 1}`}
                    />
                  </div>
                ))}

                {/* Hidden title — derived from question on the server action */}
                <input type="hidden" name="title" value="" />

                <div className="poll-create-meta">
                  <div className="field">
                    <label htmlFor="pollEndsAt">Closes at (optional)</label>
                    <input
                      id="pollEndsAt"
                      name="pollEndsAt"
                      type="datetime-local"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="districtId">District (optional)</label>
                    <DistrictSelect districts={districts} />
                  </div>
                </div>

                <button className="button" type="submit">Create poll</button>
              </form>
            </article>
          )}

          {!canCreatePoll && user && (
            <p className="access-note">
              Only moderators and admins can create polls.
            </p>
          )}

          <ListResultToolbar total={postsRes.total} label="polls" />

          <div className="table poll-table" role="table" aria-label="Community polls">
            <div className="table-row table-head" role="row">
              <span>Question</span>
              <span>Author</span>
              <span>Votes</span>
              <span>Status</span>
              <span>Posted</span>
            </div>
            {postsRes.data.map((p) => {
              const isClosed =
                !!p.poll?.endsAt && new Date() > new Date(p.poll.endsAt);
              const totalVotes =
                p.poll?.options.reduce((s, o) => s + o._count.votes, 0) ?? 0;
              return (
                <Link
                  key={p.id}
                  className="table-row table-row-link"
                  role="row"
                  href={`/community/${p.id}`}
                >
                  <span>
                    <strong>{p.title}</strong>
                    {p.poll?.question && (
                      <span className="poll-question-preview">{p.poll.question}</span>
                    )}
                  </span>
                  <span>{p.author.displayName}</span>
                  <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                  <span>
                    {isClosed ? (
                      <span className="tag muted">Closed</span>
                    ) : p.poll?.endsAt ? (
                      <span className="tag success">Closes {relativeTime(p.poll.endsAt)}</span>
                    ) : (
                      <span className="tag info">Open</span>
                    )}
                  </span>
                  <span>{relativeTime(p.createdAt)}</span>
                </Link>
              );
            })}
            {postsRes.data.length === 0 && (
              <div className="empty-state">
                {canCreatePoll
                  ? 'No polls yet. Create the first one above.'
                  : 'No polls yet.'}
              </div>
            )}
          </div>

          <ListPagination
            pathname="/community"
            page={postsRes.page}
            pageSize={postsRes.pageSize}
            total={postsRes.total}
            query={{ tab: 'polls', districtId }}
          />
        </>
      )}
    </>
  );
}

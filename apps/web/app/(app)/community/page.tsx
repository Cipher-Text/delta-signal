import Link from 'next/link';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { cookies } from 'next/headers';
import { getCurrentUser } from '../../../lib/current-user';
import { createPostAction, deletePostAction } from '../../../lib/community-actions';
import { routes, type CommunityPostListResponse } from '@delta-signal/contracts';
import { dhakaDateTimeShort, pluralize, relativeTime } from '../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import type { DistrictWithDivision } from '../../../components/district-select';
import AutoSubmitSelect from '../../../components/auto-submit-select';
import Composer from '../../../components/community/composer';
import PollOptions from '../../../components/community/poll-options';
import EmptyState from '../../../components/empty-state';
import ListPagination from '../../../components/list-pagination';
import NavIcon from '../../../components/nav-icons';
import PageHeader from '../../../components/page-header';

type Show = 'all' | 'posts' | 'polls';
type Query = { show?: string; tab?: string; districtId?: string; page?: string; created?: string; deleted?: string; error?: string };

const FILTERS: { key: Show; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'posts', label: 'Discussions' },
  { key: 'polls', label: 'Polls' },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Within a day: "5 min ago"; older: "3 Oct 2026, 18:20" (Dhaka time). */
function postedAt(iso: string): string {
  return Date.now() - new Date(iso).getTime() < 86_400_000 ? relativeTime(iso) : dhakaDateTimeShort(iso);
}

function groupByDivision(districts: DistrictWithDivision[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  for (const d of districts) {
    const div = d.division?.name ?? 'Other';
    if (!map.has(div)) map.set(div, []);
    map.get(div)!.push({ id: d.id, name: d.name });
  }
  return [...map.entries()].map(([division, list]) => ({ division, districts: list }));
}

/** Community feed (Web UI Reference): composer, All / Discussions / Polls filter, post cards with in-feed voting. */
export default async function CommunityPage(props: { searchParams: Promise<Query> }) {
  const sp = await props.searchParams;
  // `tab=` was the old Posts/Polls switch; keep old links working.
  const raw = sp.show ?? sp.tab;
  const show: Show = raw === 'polls' ? 'polls' : raw === 'posts' ? 'posts' : 'all';
  const districtId = sp.districtId || undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const path =
    `${routes.community.posts}?page=${page}&pageSize=20` +
    (show !== 'all' ? `&hasPoll=${show === 'polls'}` : '') +
    (districtId ? `&districtId=${districtId}` : '');
  const empty: CommunityPostListResponse = { data: [], total: 0, page: 1, pageSize: 20, counts: { all: 0, posts: 0, polls: 0 }, userVotes: {} };

  const [feed, districts] = await Promise.all([
    (user ? apiGetAuthed<CommunityPostListResponse>(path, accessToken) : apiGet<CommunityPostListResponse>(path, 0)).catch(() => empty),
    apiGet<DistrictWithDivision[]>(routes.locations.districts, 3600).catch((): DistrictWithDivision[] => []),
  ]);

  const canPoll = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const filterHref = (key: Show) => {
    const params = new URLSearchParams();
    if (key !== 'all') params.set('show', key);
    if (districtId) params.set('districtId', districtId);
    const s = params.toString();
    return s ? `/community?${s}` : '/community';
  };

  return (
    <div className="page-stack cm-page">
      <PageHeader
        title="Community"
        description={<><span className="cm-sub-long">Discussions and polls from people working on Bangladesh&apos;s environment.</span><span className="cm-sub-short">Discussions and polls · not verified data</span></>}
      />

      <div className="cm-layout">
        <div className="cm-main">
          <section aria-label="Create a post">
            {user ? (
              <Composer action={createPostAction} districts={groupByDivision(districts)} initials={initials(user.displayName)} canPoll={canPoll} />
            ) : (
              <Link href="/login?next=/community" className="cm-compose-bar">
                <span className="cm-avatar" aria-hidden="true"><NavIcon name="community" /></span>
                <span>Sign in to share an update or ask a question</span>
              </Link>
            )}
          </section>

          {sp.created && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Published. Your post is at the top of the feed.</div>}
          {sp.deleted && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Post deleted.</div>}
          {sp.error && <div className="pf-notice pf-notice--err" role="alert">{sp.error}</div>}

          <div className="cm-controls">
            <nav className="dt-seg cm-seg" aria-label="Show">
              {FILTERS.map((f) => (
                <Link key={f.key} href={filterHref(f.key)} aria-current={show === f.key ? 'true' : undefined}>
                  {f.label}
                  <span>{feed.counts[f.key]}</span>
                </Link>
              ))}
            </nav>
            <form method="get" action="/community" className="cm-filter">
              {show !== 'all' && <input type="hidden" name="show" value={show} />}
              <span className="cm-order">Newest first</span>
              <AutoSubmitSelect name="districtId" aria-label="District" defaultValue={districtId ?? ''}>
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </AutoSubmitSelect>
            </form>
          </div>

          {feed.data.length === 0 ? (
            <EmptyState
              title="Nothing here yet."
              description={districtId ? 'Start the conversation for this district.' : 'Start the conversation.'}
            />
          ) : (
            <div className="cm-feed">
              {feed.data.map((p) => {
                const poll = p.poll;
                const closed = !!poll?.endsAt && new Date(poll.endsAt) < new Date();
                const canDelete = user && (user.id === p.author.id || user.role === 'ADMIN' || user.role === 'MODERATOR');
                const comments = p._count.comments;
                return (
                  <article key={p.id} className="cm-post">
                    <header>
                      <span className="cm-avatar" aria-hidden="true">{initials(p.author.displayName)}</span>
                      <div className="cm-post-by">
                        <strong>{p.author.displayName}</strong>
                        <span>{postedAt(p.createdAt)}{p.district ? ` · ${p.district.name}` : ''}</span>
                      </div>
                      {poll && <span className="cm-badge">Poll</span>}
                      {canDelete && (
                        <details className="cm-menu">
                          <summary aria-label="More actions"><NavIcon name="more" /></summary>
                          <form action={deletePostAction.bind(null, p.id, !!poll)}>
                            <button type="submit">Delete post</button>
                          </form>
                        </details>
                      )}
                    </header>
                    <div className="cm-post-body">
                      <h3><Link href={`/community/${p.id}`}>{poll ? poll.question : p.title}</Link></h3>
                      {p.body && <p>{p.body}</p>}
                    </div>
                    {poll && (
                      <PollOptions
                        postId={p.id}
                        options={poll.options.map((o) => ({ id: o.id, text: o.text, votes: o._count.votes }))}
                        votedId={feed.userVotes[poll.id] ?? null}
                        closed={closed}
                        canVote={!!user}
                        meta={
                          poll.endsAt
                            ? closed
                              ? 'Closed'
                              : `Closes ${dhakaDateTimeShort(poll.endsAt)}`
                            : 'No closing date'
                        }
                      />
                    )}
                    <footer>
                      <Link href={`/community/${p.id}`}>
                        <NavIcon name="community" />
                        {comments === 0 ? 'Comment' : pluralize(comments, 'comment')}
                      </Link>
                      <Link href={`/community/${p.id}`}>Open discussion →</Link>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}

          <ListPagination
            pathname="/community"
            page={feed.page}
            pageSize={feed.pageSize}
            total={feed.total}
            query={{ show: show === 'all' ? undefined : show, districtId }}
          />
        </div>

        <aside className="cm-aside" aria-label="About the community">
          <section>
            <h2>Community guidelines</h2>
            <ul>
              <li>Share sources for facts and figures.</li>
              <li>Keep it about Bangladesh&apos;s environment.</li>
              <li>Be respectful. Moderators remove abuse and misinformation.</li>
            </ul>
          </section>
          <section>
            <h2>Posts or reports?</h2>
            <p>
              Community posts are open discussion and are not verified. To flag pollution, flooding or dumping at a location,
              submit a citizen report so moderators can verify and map it.
            </p>
            <Link href="/reports">Submit a citizen report</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

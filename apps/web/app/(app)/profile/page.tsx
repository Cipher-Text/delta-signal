import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { subscribeAction, unsubscribeAction } from '../../../lib/notification-actions';
import {
  routes,
  type CitizenReport,
  type Observation,
  type AlertSubscription,
  type PaginatedEnvelope,
  type GamificationSummary,
} from '@delta-signal/contracts';
import { titleCase, relativeTime, dhakaDateTime, dhakaDate } from '../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  updateProfileAction,
  changePasswordAction,
  uploadProfilePictureAction,
  removeProfilePictureAction,
} from '../../../lib/profile-actions';
import type { DistrictWithDivision } from '../../../components/district-select';
import ProfilePictureForm from '../../../components/profile-picture-form';
import NavIcon from '../../../components/nav-icons';
import ProfileForm from '../../../components/profile/profile-form';
import { LINK_PLATFORMS } from '../../../lib/profile-links';
import AlertSubscribeForm from '../../../components/profile/alert-subscribe-form';
import PasswordForm from '../../../components/profile/password-form';

// ── Constants ────────────────────────────────────────────────────────────────

type ProfileTab = 'personal' | 'alerts' | 'security';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'personal', label: 'Profile' },
  { id: 'alerts', label: 'Alert emails' },
  { id: 'security', label: 'Security' },
];

const ROLE_LABELS: Record<string, string> = {
  CITIZEN: 'Citizen',
  RESEARCHER: 'Researcher',
  ORGANIZATION_ADMIN: 'Organization admin',
  GOVERNMENT: 'Government',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

const SEVERITY_LABEL: Record<string, string> = {
  INFO: 'All alerts',
  WATCH: 'Watch and above',
  WARNING: 'Warning and above',
  EMERGENCY: 'Emergency only',
};

const BADGE_CATEGORIES: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'civic_guardian', label: 'Civic Guardian', emoji: '🛡️' },
  { key: 'water_sentinel', label: 'Water Sentinel', emoji: '🌊' },
  { key: 'clean_air_defender', label: 'Clean Air Defender', emoji: '🌬️' },
  { key: 'biodiversity_explorer', label: 'Biodiversity Explorer', emoji: '🌿' },
  { key: 'restoration_pioneer', label: 'Restoration Pioneer', emoji: '🌳' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function monthYear(iso: string, month: 'long' | 'short' = 'long'): string {
  return new Date(iso).toLocaleDateString('en-US', { month, year: 'numeric' });
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

const empty = <T,>(): PaginatedEnvelope<T> => ({ data: [], total: 0, page: 1, pageSize: 10 });

// ── Left column ───────────────────────────────────────────────────────────────

function StrengthCard({ game }: { game: GamificationSummary | null }) {
  if (!game) return null;
  const earned = game.badges.filter((b) => b.earned).length;
  const visible = game.missingFields.slice(0, 4);
  const rest = game.missingFields.slice(4);
  const points =
    game.nextLevelPoints > 0 ? `${game.points} of ${game.nextLevelPoints} points` : `${game.points} points`;

  return (
    <section className="pf-side-card" aria-labelledby="pf-strength-h">
      <div className="pf-side-title">
        <h2 id="pf-strength-h">Profile strength</h2>
        <strong>{game.completeness}%</strong>
      </div>
      <div
        className="pf-bar"
        role="progressbar"
        aria-valuenow={game.completeness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile strength"
      >
        <span style={{ width: `${game.completeness}%` }} />
      </div>
      <p className="pf-side-sub">
        Level {game.level} · {game.levelLabel} · {points} · {earned} of {game.badges.length} badges
      </p>

      {visible.length > 0 && (
        <ul className="pf-todo">
          {visible.map((f) => (
            <li key={f.key}>
              <Link href={f.href} title={f.hint}>
                <span>{f.label}</span>
                <b>+{f.weight}%</b>
                <NavIcon name="chevron-right" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details className="pf-more">
        <summary>
          See {rest.length > 0 ? `${game.missingFields.length} remaining steps and ` : 'all '}badges
        </summary>
        {rest.length > 0 && (
          <ul className="pf-todo">
            {rest.map((f) => (
              <li key={f.key}>
                <Link href={f.href} title={f.hint}>
                  <span>{f.label}</span>
                  <b>+{f.weight}%</b>
                  <NavIcon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ul className="pf-badges">
          {BADGE_CATEGORIES.map((c) => {
            const tiers = game.badges.filter((b) => b.category === c.key);
            if (tiers.length === 0) return null;
            const done = tiers.filter((b) => b.earned).length;
            return (
              <li key={c.key} title={tiers.map((b) => `${b.tierLabel}: ${b.description}`).join('\n')}>
                <span aria-hidden="true">{c.emoji}</span>
                <span className="pf-badge-name">{c.label}</span>
                <span className="pf-tiers" aria-label={`${done} of ${tiers.length} tiers earned`}>
                  {tiers.map((b) => (
                    <i key={b.key} data-on={b.earned} />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage(props: {
  searchParams: Promise<{
    tab?: string;
    subscribed?: string;
    unsubscribed?: string;
    sub_error?: string;
    profileSaved?: string;
    profileError?: string;
    profilePictureSaved?: string;
    profilePictureError?: string;
    pwError?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const activeTab: ProfileTab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as ProfileTab) : 'personal';

  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const [myReports, myObservations, subscriptions, districts, game] = await Promise.all([
    apiGetAuthed<PaginatedEnvelope<CitizenReport>>(routes.reports.mine, accessToken).catch(() => empty<CitizenReport>()),
    apiGetAuthed<PaginatedEnvelope<Observation>>(routes.observations.mine, accessToken).catch(() => empty<Observation>()),
    apiGetAuthed<AlertSubscription[]>(routes.notifications.subscriptions, accessToken).catch((): AlertSubscription[] => []),
    apiGet<DistrictWithDivision[]>(routes.locations.districts),
    apiGetAuthed<GamificationSummary>(routes.gamification.me, accessToken).catch((): null => null),
  ]);

  const profile = user?.profile;
  const social = Object.fromEntries((user?.socialLinks ?? []).map((l) => [l.platform, l.url]));
  const districtGroups = groupByDivision(districts);
  const hasContributions = myReports.total + myObservations.total > 0;
  const recent = [
    ...myReports.data.slice(0, 2).map((r) => ({ id: r.id, href: `/reports/${r.id}`, title: r.title, meta: titleCase(r.status) })),
    ...myObservations.data.slice(0, 2).map((o) => ({ id: o.id, href: `/observations/${o.id}`, title: titleCase(o.category), meta: relativeTime(o.observedAt) })),
  ];

  return (
    <div className="pf-page">
      <div className="pf-title">
        <h1>Your profile</h1>
        <p>Manage how you appear to others, your alert emails and your password.</p>
      </div>

      <div className="pf-layout">
        <aside className="pf-aside" aria-label="Your profile summary">
          <section className="pf-side-card pf-identity" aria-label="Identity">
            <div className="pf-identity-row">
              <span className="pf-avatar">
                {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span aria-hidden="true">{user ? initials(user.displayName) : '?'}</span>}
              </span>
              <div className="pf-identity-text">
                <strong>{user?.displayName ?? 'Your profile'}</strong>
                <span className="pf-identity-meta">
                  {user && <span className="pf-role">{ROLE_LABELS[user.role] ?? user.role}</span>}
                  {user && <span>Since {monthYear(user.createdAt, 'short')}</span>}
                </span>
              </div>
            </div>
            {user && (
              <div className="pf-photo">
                <ProfilePictureForm uploadAction={uploadProfilePictureAction} />
                {profile?.avatarUrl && (
                  <form action={removeProfilePictureAction} className="profile-picture-remove-form">
                    <button className="profile-picture-remove" type="submit">Remove</button>
                  </form>
                )}
              </div>
            )}
          </section>

          <StrengthCard game={game} />

          <section className="pf-side-card" aria-labelledby="pf-contrib-h">
            <h2 id="pf-contrib-h">Your contributions</h2>
            <div className="pf-counts">
              <Link href="/reports"><b>{myReports.total}</b><span>Reports</span></Link>
              <Link href="/observations"><b>{myObservations.total}</b><span>Observations</span></Link>
              <Link href="/profile?tab=alerts"><b>{subscriptions.length}</b><span>Alert emails</span></Link>
            </div>
            {hasContributions ? (
              <ul className="pf-recent">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={r.href}><span>{r.title}</span><small>{r.meta}</small></Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pf-side-sub">
                Nothing submitted yet. <Link href="/reports">Submit a report</Link> or <Link href="/observations">add an observation</Link>.
              </p>
            )}
            {user?.role === 'CITIZEN' && (
              <p className="pf-side-foot">
                Published research? <Link href="/researcher-application">Apply for researcher access</Link>
              </p>
            )}
          </section>
        </aside>

        <div className="pf-main">
          <nav className="pf-tabs" aria-label="Profile sections">
            {TABS.map((t) => (
              <Link key={t.id} href={`/profile?tab=${t.id}`} aria-current={activeTab === t.id ? 'page' : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>

          {sp.profileSaved && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Profile saved</div>}
          {sp.profileError && <div className="pf-notice pf-notice--err" role="alert">{sp.profileError}</div>}
          {sp.profilePictureSaved && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Profile photo updated</div>}
          {sp.profilePictureError && <div className="pf-notice pf-notice--err" role="alert">{sp.profilePictureError}</div>}

          {activeTab === 'personal' && (
            <div className="pf-panel">
              <ProfileForm
                action={updateProfileAction}
                districts={districtGroups}
                values={{
                  displayName: user?.displayName ?? '',
                  email: user?.email ?? '',
                  phone: profile?.phone ?? '',
                  locationDistrict: profile?.locationDistrict ?? '',
                  country: profile?.locationCountry ?? 'Bangladesh',
                  occupation: profile?.occupation ?? '',
                  institution: profile?.institution ?? '',
                  education: profile?.education ?? '',
                  bio: profile?.bio ?? '',
                  expertise: profile?.expertise ?? [],
                  researchInterests: profile?.researchInterests ?? [],
                  links: Object.fromEntries(LINK_PLATFORMS.map((p) => [p.key, social[p.key] ?? ''])),
                  profileVisibility: profile?.profileVisibility ?? 'PUBLIC',
                  contactVisibility: profile?.contactVisibility ?? 'PRIVATE',
                  linksVisibility: profile?.linksVisibility ?? 'PUBLIC',
                }}
              />
              {user?.organizations && user.organizations.length > 0 && (
                <section className="pf-section pf-orgs">
                  <div className="pf-section-head">
                    <h3>Organizations</h3>
                    <p>Memberships are managed by organization admins.</p>
                  </div>
                  <ul className="pf-section-body pf-org-list">
                    {user.organizations.map((org) => (
                      <li key={org.id}>
                        <Link href={`/organizations/${org.id}`}>{org.name}</Link>
                        <span>{titleCase(org.type)}{org.isVerified ? ' · Verified' : ''} · {titleCase(org.membershipRole)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="pf-panel">
              <div className="pf-form-head">
                <h2>Alert emails</h2>
                <p>Choose where alerts matter to you and the minimum severity that reaches your inbox.</p>
              </div>
              {sp.subscribed && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Subscription added</div>}
              {sp.unsubscribed && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />Unsubscribed</div>}
              {sp.sub_error && <div className="pf-notice pf-notice--err" role="alert">{sp.sub_error}</div>}

              <section className="pf-section pf-section--stack">
                <h3>Your subscriptions</h3>
                {subscriptions.length === 0 ? (
                  <p className="pf-empty">
                    <b>You&apos;re not subscribed to any alerts yet.</b> Add one below to get emails about a district or all of Bangladesh.
                  </p>
                ) : (
                  <ul className="pf-subs">
                    {subscriptions.map((s) => (
                      <li key={s.id}>
                        <span className="pf-sub-icon"><NavIcon name="alerts" /></span>
                        <div>
                          <strong>{s.district ? `${s.district.name} district` : 'Nationwide'}</strong>
                          <small>
                            {SEVERITY_LABEL[s.minSeverity] ?? s.minSeverity} · Email · added {dhakaDate(s.createdAt)}
                          </small>
                        </div>
                        <form action={unsubscribeAction.bind(null, s.id)}>
                          <button type="submit" className="pf-link-btn" aria-label={`Unsubscribe from ${s.district?.name ?? 'nationwide'} alerts`}>
                            Unsubscribe
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="pf-section pf-section--stack">
                <h3>Add a subscription</h3>
                <AlertSubscribeForm action={subscribeAction} districts={districtGroups} email={user?.email ?? ''} />
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="pf-panel">
              <div className="pf-form-head">
                <h2>Security</h2>
                <p>Your account details and sign-in password.</p>
              </div>

              <section className="pf-section pf-section--stack">
                <h3>Account</h3>
                <dl className="pf-facts">
                  <div><dt>Email address</dt><dd>{user?.email}</dd></div>
                  <div><dt>Role</dt><dd><span className="pf-role">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span></dd></div>
                  <div>
                    <dt>Last sign-in</dt>
                    <dd>{user?.lastLoginAt ? <>{dhakaDateTime(user.lastLoginAt)} · {relativeTime(user.lastLoginAt)}</> : 'Unknown'}</dd>
                  </div>
                  <div><dt>Member since</dt><dd>{user?.createdAt ? monthYear(user.createdAt) : '—'}</dd></div>
                </dl>
              </section>

              <section className="pf-section pf-section--stack">
                <h3>Change password</h3>
                {user?.authProvider === 'GOOGLE' ? (
                  <p className="pf-empty">Your account is signed in with Google. Password management is handled by Google.</p>
                ) : (
                  <>
                    {sp.pwError && <div className="pf-notice pf-notice--err" role="alert">{sp.pwError}</div>}
                    <PasswordForm action={changePasswordAction} />
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

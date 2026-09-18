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
  type BadgeSummary,
  type MissingField,
} from '@delta-signal/contracts';
import { titleCase, relativeTime } from '../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { updateProfileAction, changePasswordAction, uploadProfilePictureAction, removeProfilePictureAction } from '../../../lib/profile-actions';
import { ENVIRONMENTAL_EXPERTISE, ENVIRONMENTAL_RESEARCH_INTERESTS } from '@delta-signal/shared';
import TagInput from '../../../components/tag-input';
import DistrictSelect, { type DistrictWithDivision } from '../../../components/district-select';

// ── Constants ────────────────────────────────────────────────────────────────

type ProfileTab = 'personal' | 'location' | 'alerts' | 'contributions' | 'security' | 'achievements';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'personal',     label: 'Personal Info' },
  { id: 'location',     label: 'Location & Scope' },
  { id: 'alerts',       label: 'Notifications' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'security',     label: 'Security' },
];

const ROLE_LABELS: Record<string, string> = {
  CITIZEN:            'Citizen contributor',
  RESEARCHER:         'Researcher',
  ORGANIZATION_ADMIN: 'Organization admin',
  GOVERNMENT:         'Government official',
  MODERATOR:          'Moderator',
  ADMIN:              'Administrator',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  CITIZEN:            'role-citizen',
  RESEARCHER:         'role-researcher',
  ORGANIZATION_ADMIN: 'role-org-admin',
  GOVERNMENT:         'role-government',
  MODERATOR:          'role-moderator',
  ADMIN:              'role-admin',
};

const REPORT_STATUS_VARIANT: Record<string, string> = {
  VERIFIED:     'success',
  RESOLVED:     'success',
  REJECTED:     'danger',
  SUBMITTED:    'muted',
  UNDER_REVIEW: 'info',
};

const TRUST_VARIANT: Record<string, string> = {
  RESEARCH_GRADE: 'success',
  COMMUNITY:      'info',
  UNVERIFIED:     'muted',
  FLAGGED:        'danger',
};

const SEVERITY_LABEL: Record<string, string> = {
  INFO:      'All alerts (Info+)',
  WATCH:     'Watch and above',
  WARNING:   'Warning and above',
  EMERGENCY: 'Emergency only',
};

const SEVERITY_VARIANT: Record<string, string> = {
  INFO:      'info',
  WATCH:     'warning',
  WARNING:   'warning',
  EMERGENCY: 'danger',
};

const SOCIAL_PLATFORMS = [
  'googleScholar', 'researchGate', 'orcid',
  'linkedin', 'website', 'github', 'facebook',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByDivision(districts: DistrictWithDivision[]): Map<string, DistrictWithDivision[]> {
  const map = new Map<string, DistrictWithDivision[]>();
  for (const d of districts) {
    const div = d.division?.name ?? 'Other';
    if (!map.has(div)) map.set(div, []);
    map.get(div)!.push(d);
  }
  return map;
}

// ── Profile Strength Widget ───────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 28; // r=28, cx=cy=36 in a 72x72 viewBox

function ProfileStrengthWidget({ game }: { game: GamificationSummary | null }) {
  if (!game) return null;

  const { completeness, missingFields, points, level, levelLabel, nextLevelPoints } = game;
  const offset = CIRCUMFERENCE * (1 - completeness / 100);

  return (
    <div className="strength-widget" aria-label="Profile strength">
      <div className="strength-widget-left">
        <div className="strength-circle-wrap" aria-hidden="true">
          <svg viewBox="0 0 72 72" width="72" height="72" className="strength-circle">
            <circle cx="36" cy="36" r="28" fill="none" strokeWidth="6" className="strength-track" />
            <circle
              cx="36" cy="36" r="28" fill="none" strokeWidth="6"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="strength-fill"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span className="strength-pct">{completeness}%</span>
        </div>

        <div className="strength-text">
          <strong>Profile strength</strong>
          <span>{completeness === 100 ? 'Complete!' : `${missingFields.length} item${missingFields.length !== 1 ? 's' : ''} remaining`}</span>
          <span className="strength-level">
            Lv.{level} · {levelLabel}
            {nextLevelPoints > 0 && <> · <strong>{points}</strong>/{nextLevelPoints} pts</>}
            {nextLevelPoints === -1 && <> · <strong>{points}</strong> pts (max)</>}
          </span>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className="strength-chips" aria-label="Quick actions to improve profile">
          {missingFields.slice(0, 4).map((f: MissingField) => (
            <a key={f.key} href={f.href} className="strength-chip" title={f.hint}>
              +{f.weight}% {f.label}
            </a>
          ))}
          {missingFields.length > 4 && (
            <span className="strength-chip strength-chip-more">+{missingFields.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Badge Grid ────────────────────────────────────────────────────────────────

const BADGE_CATEGORIES: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'civic_guardian',        label: 'Civic Guardian',        emoji: '🛡️' },
  { key: 'water_sentinel',        label: 'Water Sentinel',        emoji: '🌊' },
  { key: 'clean_air_defender',    label: 'Clean Air Defender',    emoji: '🌬️' },
  { key: 'biodiversity_explorer', label: 'Biodiversity Explorer', emoji: '🌿' },
  { key: 'restoration_pioneer',   label: 'Restoration Pioneer',   emoji: '🌳' },
];

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'EMERALD'] as const;

const TIER_CSS: Record<string, string> = {
  BRONZE:  'badge-tier-bronze',
  SILVER:  'badge-tier-silver',
  GOLD:    'badge-tier-gold',
  EMERALD: 'badge-tier-emerald',
};

function BadgeCard({ badge }: { badge: BadgeSummary }) {
  const progressPct = badge.threshold > 0
    ? Math.round((Math.min(badge.current, badge.threshold) / badge.threshold) * 100)
    : 0;

  return (
    <div
      className={`badge-card ${badge.earned ? 'badge-earned' : 'badge-locked'} ${TIER_CSS[badge.tier] ?? ''}`}
      title={badge.description}
      aria-label={`${badge.label} ${badge.tierLabel} badge${badge.earned ? ' — earned' : ` — ${badge.current}/${badge.threshold}`}`}
    >
      <div className="badge-card-header">
        <span className="badge-emoji" aria-hidden="true">{badge.emoji}</span>
        <span className="badge-tier-label">{badge.tierLabel}</span>
        {badge.earned && (
          <span className="badge-earned-mark" aria-label="Earned">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        )}
      </div>
      <p className="badge-description">{badge.description}</p>
      {!badge.earned && (
        <div className="badge-progress" aria-label={`Progress: ${badge.current} of ${badge.threshold}`}>
          <div className="badge-progress-bar" style={{ width: `${progressPct}%` }} />
          <span className="badge-progress-label">{badge.current}/{badge.threshold}</span>
        </div>
      )}
      <div className="badge-points">{badge.points} pts</div>
    </div>
  );
}

function BadgeGrid({ game }: { game: GamificationSummary | null }) {
  if (!game) {
    return (
      <div className="empty-state">
        Achievement data is unavailable. Reload the page to try again.
      </div>
    );
  }

  const earnedCount = game.badges.filter((b) => b.earned).length;

  return (
    <div className="badge-grid">
      <div className="badge-grid-summary">
        <strong>{earnedCount}</strong> of <strong>{game.badges.length}</strong> badges earned
        &nbsp;·&nbsp;
        <strong>{game.points}</strong> contribution points
        &nbsp;·&nbsp;
        Level {game.level} — {game.levelLabel}
        {game.nextLevelPoints > 0 && (
          <> &nbsp;·&nbsp; <strong>{game.nextLevelPoints - game.points}</strong> pts to next level</>
        )}
      </div>

      {BADGE_CATEGORIES.map(({ key, label, emoji }) => {
        const catBadges = TIER_ORDER.map((tier) =>
          game.badges.find((b) => b.category === key && b.tier === tier)
        ).filter(Boolean) as BadgeSummary[];

        if (catBadges.length === 0) return null;

        return (
          <section key={key} className="badge-category">
            <h3 className="badge-category-title">
              <span aria-hidden="true">{emoji}</span> {label}
            </h3>
            <div className="badge-category-grid">
              {catBadges.map((badge) => (
                <BadgeCard key={badge.key} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage(
  props: {
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
  }
) {
  const searchParams = await props.searchParams;
  const activeTab: ProfileTab =
    searchParams.tab && TABS.some((t) => t.id === searchParams.tab)
      ? (searchParams.tab as ProfileTab)
      : 'personal';

  const user        = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  const [myReports, myObservations, subscriptions, districts, gameData] = await Promise.all([
    apiGetAuthed<PaginatedEnvelope<CitizenReport>>(routes.reports.mine, accessToken).catch(
      (): PaginatedEnvelope<CitizenReport> => ({ data: [], total: 0, page: 1, pageSize: 10 }),
    ),
    apiGetAuthed<PaginatedEnvelope<Observation>>(routes.observations.mine, accessToken).catch(
      (): PaginatedEnvelope<Observation> => ({ data: [], total: 0, page: 1, pageSize: 10 }),
    ),
    apiGetAuthed<AlertSubscription[]>(routes.notifications.subscriptions, accessToken).catch(
      (): AlertSubscription[] => [],
    ),
    apiGet<DistrictWithDivision[]>(routes.locations.districts),
    apiGetAuthed<GamificationSummary>(routes.gamification.me, accessToken).catch(
      (): null => null,
    ),
  ]);

  const profile  = user?.profile;
  const social   = Object.fromEntries((user?.socialLinks ?? []).map((l) => [l.platform, l.url]));
  const districtsByDivision = groupByDivision(districts);

  return (
    <>
      {/* ── Profile Banner ─────────────────────────────────────────────────── */}
      <div className="profile-banner" aria-label="Your profile">
        <div className="profile-banner-top" aria-hidden="true" />
        <div className="profile-banner-body">
          <div className="profile-avatar-editor">
            <div className="profile-avatar-xl">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                <span aria-hidden="true">{user ? initials(user.displayName) : '?'}</span>
              )}
            </div>
            {user && <>
              <form action={uploadProfilePictureAction} className="profile-avatar-actions">
                <label className="button ghost profile-picture-button">
                  Change photo
                  <input name="picture" type="file" accept="image/jpeg,image/png,image/webp" required />
                </label>
                <button className="button profile-picture-submit" type="submit">Upload photo</button>
                <small>JPG, PNG or WebP · max 5 MB</small>
              </form>
              {profile?.avatarUrl && (
                <form action={removeProfilePictureAction} className="profile-picture-remove-form">
                  <button className="profile-picture-remove" type="submit">Remove photo</button>
                </form>
              )}
            </>}
          </div>

          <div className="profile-banner-info">
            <h1>{user?.displayName ?? 'Your Profile'}</h1>

            <div className="profile-banner-meta">
              {user && (
                <span className={`profile-role-badge ${ROLE_BADGE_CLASS[user.role] ?? 'role-citizen'}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              )}
              {profile?.locationDistrict && (
                <span className="profile-location-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-8-7.3-8-13a8 8 0 0 1 16 0c0 5.7-8 13-8 13z"/><circle cx="12" cy="8" r="3"/></svg>
                  {profile.locationDistrict}
                </span>
              )}
              <span className="profile-location-badge">{user?.email}</span>
              {user?.organizations?.filter((o) => o.isVerified).map((org) => (
                <span key={org.id} className="profile-org-badge">{org.name}</span>
              ))}
            </div>

            <div className="profile-banner-stats" aria-label="Activity summary">
              <div className="profile-banner-stat">
                <strong>{myReports.total}</strong>
                <span>Reports</span>
              </div>
              <div className="profile-banner-stat">
                <strong>{myObservations.total}</strong>
                <span>Observations</span>
              </div>
              <div className="profile-banner-stat">
                <strong>{subscriptions.length}</strong>
                <span>Subscriptions</span>
              </div>
              <div className="profile-banner-stat">
                <strong>{user ? monthYear(user.createdAt) : '—'}</strong>
                <span>Member since</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile Strength Widget ─────────────────────────────────────────── */}
      <ProfileStrengthWidget game={gameData} />

      {/* ── Flash notifications ─────────────────────────────────────────────── */}
      {searchParams.profileSaved && (
        <div className="flash flash-success" role="status">Profile updated successfully.</div>
      )}
      {searchParams.profileError && (
        <div className="flash flash-error" role="alert">{searchParams.profileError}</div>
      )}
      {searchParams.profilePictureSaved && (
        <div className="flash flash-success" role="status">Profile picture updated successfully.</div>
      )}
      {searchParams.profilePictureError && (
        <div className="flash flash-error" role="alert">{searchParams.profilePictureError}</div>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <nav className="tab-nav" aria-label="Profile sections">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/profile?tab=${tab.id}`}
            className={activeTab === tab.id ? 'active' : ''}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
            {tab.id === 'alerts' && subscriptions.length > 0 && (
              <span className="tab-badge" aria-label={`${subscriptions.length} active`}>
                {subscriptions.length}
              </span>
            )}
            {tab.id === 'achievements' && gameData && (() => {
              const earned = gameData.badges.filter((b) => b.earned).length;
              return earned > 0
                ? <span className="tab-badge tab-badge-gold" aria-label={`${earned} badges earned`}>{earned}</span>
                : null;
            })()}
            {tab.id === 'contributions' && (myReports.total + myObservations.total > 0) && (
              <span className="tab-badge" aria-label={`${myReports.total + myObservations.total} contributions`}>
                {myReports.total + myObservations.total}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* ══ Personal Info Tab ═══════════════════════════════════════════════ */}
      {activeTab === 'personal' && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Personal information</h2>
              <p>Manage the information shown on your public profile. Fields are optional unless marked required.</p>
            </div>
          </div>

          <form action={updateProfileAction} className="profile-form">
            <input type="hidden" name="_tab" value="personal" />


            {/* Identity */}
            <h3>About you</h3>
            <div className="profile-form-grid">
              <label>
                Display name
                <input name="displayName" defaultValue={user?.displayName} required placeholder="Your full name" />
              </label>
              <label>
                Email address
                <input value={user?.email ?? ''} readOnly aria-describedby="email-hint" />
                <small id="email-hint" className="field-hint">Managed by your administrator. Change it from Security if supported.</small>
              </label>
              <label>
                Phone number
                <input name="phone" type="tel" defaultValue={profile?.phone ?? ''} placeholder="+880 ..." />
              </label>
              <label>
                Country
                <input value={profile?.locationCountry ?? 'Bangladesh'} readOnly />
              </label>
            </div>

            {/* Professional */}
            <h3>Professional details <span className="section-optional">Optional</span></h3>
            <div className="profile-form-grid">
              <label>
                Occupation
                <input name="occupation" defaultValue={profile?.occupation ?? ''} placeholder="e.g. Field researcher, Ecologist" />
              </label>
              <label>
                Institution / Employer
                <input name="institution" defaultValue={profile?.institution ?? ''} placeholder="e.g. IUCN Bangladesh" />
              </label>
              <label>
                Education
                <input name="education" defaultValue={profile?.education ?? ''} placeholder="Degree or qualification" />
              </label>
            </div>
            <label>
              Biography
              <textarea name="bio" defaultValue={profile?.bio ?? ''} rows={4} placeholder="A short introduction to yourself and your environmental work..." />
            </label>

            {/* Expertise */}
            <h3>Expertise &amp; research interests <span className="section-optional">Optional</span></h3>
            <div className="profile-form-grid">
              <TagInput
                name="expertise"
                label="Expertise areas"
                initialValues={profile?.expertise ?? []}
                suggestions={ENVIRONMENTAL_EXPERTISE}
                placeholder="Add expertise..."
              />
              <TagInput
                name="researchInterests"
                label="Research interests"
                initialValues={profile?.researchInterests ?? []}
                suggestions={ENVIRONMENTAL_RESEARCH_INTERESTS}
                placeholder="Add interest..."
              />
            </div>

            {/* Social links */}
            <h3>Professional &amp; social links <span className="section-optional">Optional</span></h3>
            <div className="profile-form-3col">
              <label>Google Scholar<input name="googleScholar" defaultValue={social.googleScholar ?? ''} placeholder="https://scholar.google.com/..." /></label>
              <label>ResearchGate<input name="researchGate"   defaultValue={social.researchGate   ?? ''} placeholder="https://researchgate.net/..." /></label>
              <label>ORCID<input name="orcid"          defaultValue={social.orcid          ?? ''} placeholder="https://orcid.org/..." /></label>
              <label>LinkedIn<input name="linkedin"       defaultValue={social.linkedin       ?? ''} placeholder="https://linkedin.com/in/..." /></label>
              <label>Personal website<input name="website"         defaultValue={social.website         ?? ''} placeholder="https://..." /></label>
              <label>GitHub<input name="github"         defaultValue={social.github         ?? ''} placeholder="https://github.com/..." /></label>
              <label>Facebook<input name="facebook"       defaultValue={social.facebook       ?? ''} placeholder="https://facebook.com/..." /></label>
            </div>

            {/* Visibility */}
            <h3>Privacy &amp; visibility</h3>
            <p className="section-help">Choose who can see your profile, contact details, and professional links.</p>
            <div className="profile-form-3col">
              <label>
                Profile visibility
                <select name="profileVisibility" defaultValue={profile?.profileVisibility ?? 'PUBLIC'}>
                  <option value="PUBLIC">Public — anyone can view</option>
                  <option value="MEMBERS_ONLY">Members only</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
              <label>
                Contact visibility
                <select name="contactVisibility" defaultValue={profile?.contactVisibility ?? 'PRIVATE'}>
                  <option value="PUBLIC">Public</option>
                  <option value="MEMBERS_ONLY">Members only</option>
                  <option value="PRIVATE">Private — hidden</option>
                </select>
              </label>
              <label>
                Links visibility
                <select name="linksVisibility" defaultValue={profile?.linksVisibility ?? 'PUBLIC'}>
                  <option value="PUBLIC">Public</option>
                  <option value="MEMBERS_ONLY">Members only</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
            </div>

            {/* Action bar */}
            <div className="profile-save-bar">
              <button className="button" type="submit">Save changes</button>
              <Link className="button ghost" href="/profile?tab=personal">Cancel</Link>
            </div>
          </form>
        </article>
      )}

      {/* ══ Location & Geo-Scope Tab ════════════════════════════════════════ */}
      {activeTab === 'location' && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Location &amp; geo-scope</h2>
              <p>Set your primary administrative location for localized data and reporting defaults.</p>
            </div>
          </div>

          <form action={updateProfileAction} className="profile-form">
            <input type="hidden" name="_tab" value="location" />
            {/* Preserve all other profile fields unchanged */}
            <input type="hidden" name="displayName"      value={user?.displayName ?? ''} />
            <input type="hidden" name="phone"            value={profile?.phone ?? ''} />
            <input type="hidden" name="occupation"       value={profile?.occupation ?? ''} />
            <input type="hidden" name="bio"              value={profile?.bio ?? ''} />
            <input type="hidden" name="education"        value={profile?.education ?? ''} />
            <input type="hidden" name="institution"      value={profile?.institution ?? ''} />
            <input type="hidden" name="expertise"        value={(profile?.expertise ?? []).join(',')} />
            <input type="hidden" name="researchInterests" value={(profile?.researchInterests ?? []).join(',')} />
            <input type="hidden" name="profileVisibility"  value={profile?.profileVisibility  ?? 'PUBLIC'} />
            <input type="hidden" name="contactVisibility"  value={profile?.contactVisibility  ?? 'PRIVATE'} />
            <input type="hidden" name="linksVisibility"    value={profile?.linksVisibility    ?? 'PUBLIC'} />
            {SOCIAL_PLATFORMS.map((p) => (
              <input key={p} type="hidden" name={p} value={social[p] ?? ''} />
            ))}

            <h3>Primary district</h3>

            <div className="access-note">
              <p>Your district personalizes weather summaries, environmental data, and notification suggestions. You can still report from any district.</p>
            </div>

            <div className="profile-form-grid">
              <div>
                <label htmlFor="locationDistrict-select">District</label>
                <select
                  id="locationDistrict-select"
                  name="locationDistrict"
                  className="select-field"
                  defaultValue={profile?.locationDistrict ?? ''}
                >
                  <option value="">Not specified</option>
                  {[...districtsByDivision.entries()].map(([divName, divDistricts]) => (
                    <optgroup key={divName} label={divName}>
                      {divDistricts.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <label>
                Country
                <input value={profile?.locationCountry ?? 'Bangladesh'} readOnly />
              </label>
            </div>

            {user?.organizations && user.organizations.length > 0 && (
              <>
                <h3>Organization affiliations</h3>
                <div className="subscription-list">
                  {user.organizations.map((org) => (
                    <div key={org.id} className="subscription-row">
                      <div className="subscription-info">
                        <strong>{org.name}</strong>
                        <span className="tag muted">{titleCase(org.type)}</span>
                        {org.isVerified && <span className="tag success">Verified</span>}
                        <span className="tag info">{org.membershipRole}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="profile-save-bar">
              <button className="button" type="submit">Save location</button>
              <Link className="button ghost" href="/profile?tab=location">Cancel</Link>
            </div>
          </form>
        </article>
      )}

      {/* ══ Alert Subscriptions Tab ═════════════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Alert subscriptions</h2>
              <p>Choose where alerts matter to you and the minimum severity that should reach your inbox.</p>
            </div>
          </div>

          {searchParams.subscribed && (
            <div className="flash flash-success" role="status">Subscription created successfully.</div>
          )}
          {searchParams.unsubscribed && (
            <div className="flash flash-success" role="status">Unsubscribed successfully.</div>
          )}
          {searchParams.sub_error && (
            <div className="flash flash-error" role="alert">{searchParams.sub_error}</div>
          )}

          {subscriptions.length === 0 ? (
            <div className="empty-state"><strong>No alert subscriptions yet.</strong><span>Subscribe to stay informed about environmental changes in a district or across Bangladesh.</span></div>
          ) : (
            <div className="subscription-list">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="subscription-row">
                  <div className="subscription-info">
                    <strong>{sub.district?.name ?? 'Nationwide'}</strong>
                    <span className={`tag ${SEVERITY_VARIANT[sub.minSeverity] ?? 'muted'}`}>
                      {SEVERITY_LABEL[sub.minSeverity] ?? sub.minSeverity}
                    </span>
                    {!sub.district && <span className="tag muted">All districts</span>}
                  </div>
                  <form action={unsubscribeAction.bind(null, sub.id)}>
                    <button
                      className="button ghost"
                      type="submit"
                      aria-label={`Remove subscription for ${sub.district?.name ?? 'nationwide'}`}
                    >
                      Unsubscribe
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <div className="subscription-form-section">
            <h3>Add subscription</h3>
            <p className="section-help">Alerts will be sent to <strong>{user?.email}</strong>.</p>
            <form action={subscribeAction} className="subscription-form">
              <div className="subscription-form-fields">
                <div className="field">
                  <label htmlFor="districtId">Location</label>
                  <DistrictSelect districts={districts} emptyLabel="Nationwide (all districts)" />
                </div>
                <div className="field">
                  <label htmlFor="minSeverity">Minimum severity</label>
                  <select id="minSeverity" name="minSeverity" className="select-field">
                    <option value="INFO">All alerts (Info+)</option>
                    <option value="WATCH">Watch and above</option>
                    <option value="WARNING">Warning and above</option>
                    <option value="EMERGENCY">Emergency only</option>
                  </select>
                </div>
              </div>
              <div className="profile-save-bar">
                <button className="button" type="submit">Add subscription</button>
              </div>
            </form>
          </div>
        </article>
      )}

      {/* ══ Achievements Tab ════════════════════════════════════════════════ */}
      {activeTab === 'achievements' && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Achievements &amp; badges</h2>
              <p>Earn badges by contributing reports, observations, and participating in restoration projects.</p>
            </div>
          </div>
          <div className="access-note achievement-next-step">
            <strong>Keep contributing to unlock more badges.</strong>
            <p>Reports, observations, and restoration activity earn points and move you toward the next tier.</p>
            <div className="inline-actions"><Link className="button ghost" href="/reports">Submit a report</Link><Link className="button ghost" href="/observations">Add an observation</Link></div>
          </div>
          <BadgeGrid game={gameData} />
        </article>
      )}

      {/* ══ Security Tab ════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Security &amp; account</h2>
              <p>Review your login credentials and account details.</p>
            </div>
          </div>

          <h3>Account details</h3>
          <div className="subscription-list">
            <div className="profile-security-row">
              <div>
                <strong className="profile-security-label">Email address</strong>
                <span className="profile-security-value">{user?.email}</span>
              </div>
            </div>
            <div className="profile-security-row">
              <div>
                <strong className="profile-security-label">Account role</strong>
                <span className="profile-security-value">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
              </div>
              <span className={`profile-role-badge ${ROLE_BADGE_CLASS[user?.role ?? ''] ?? 'role-citizen'}`}>
                {user?.role}
              </span>
            </div>
            <div className="profile-security-row">
              <div>
                <strong className="profile-security-label">Last login</strong>
                <span className="profile-security-value">
                  {user?.lastLoginAt ? relativeTime(user.lastLoginAt) : 'Unknown'}
                </span>
              </div>
            </div>
            <div className="profile-security-row">
              <div>
                <strong className="profile-security-label">Member since</strong>
                <span className="profile-security-value">
                  {user?.createdAt ? monthYear(user.createdAt) : '—'}
                </span>
              </div>
            </div>
          </div>

          <h3>Change password</h3>

          {user?.authProvider === 'GOOGLE' ? (
            <div className="access-note">
              <p>Your account is signed in with Google. Password management is handled by Google.</p>
            </div>
          ) : (
            <>
              {searchParams.pwError && (
                <div className="flash flash-error" role="alert">{searchParams.pwError}</div>
              )}
              <form action={changePasswordAction} className="profile-form">
                <div className="profile-form-grid">
                  <label>
                    Current password
                    <input
                      name="currentPassword"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <div />
                  <label>
                    New password
                    <input
                      name="newPassword"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                    />
                    <small className="field-hint">Use 8–128 characters. Avoid passwords you use elsewhere.</small>
                  </label>
                  <label>
                    Confirm new password
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                    />
                  </label>
                </div>
                <div className="profile-save-bar">
                  <button className="button" type="submit">Change password</button>
                </div>
              </form>
            </>
          )}
        </article>
      )}

      {/* ── Contributions ───────────────────────────────────────────────────── */}
      {activeTab === 'contributions' && <>
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>My reports</h2>
            <p>All your submissions including pending and rejected</p>
          </div>
          <Link className="button ghost" href="/reports">Submit new</Link>
        </div>

        {myReports.data.length === 0 ? (
          <div className="empty-state">
            No reports yet. <Link href="/reports">Submit your first report</Link>.
          </div>
        ) : (
          <div className="table" role="table" aria-label="My reports">
            <div className="table-row table-head" role="row">
              <span>Title</span>
              <span>Location</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>
            {myReports.data.map((r) => (
              <Link key={r.id} className="table-row table-row-link" role="row" href={`/reports/${r.id}`}>
                <strong>{r.title}</strong>
                <span>{r.district?.name ?? '—'}</span>
                <span className={`tag ${REPORT_STATUS_VARIANT[r.status] ?? 'muted'}`}>
                  {titleCase(r.status)}
                </span>
                <span>{relativeTime(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* ── My Observations ─────────────────────────────────────────────────── */}
      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>My observations</h2>
            <p>Your submitted environmental observations</p>
          </div>
          <Link className="button ghost" href="/observations">Submit new</Link>
        </div>

        {myObservations.data.length === 0 ? (
          <div className="empty-state">
            No observations yet. <Link href="/observations">Submit your first observation</Link>.
          </div>
        ) : (
          <div className="table" role="table" aria-label="My observations">
            <div className="table-row table-head" role="row">
              <span>Category</span>
              <span>Location</span>
              <span>Trust level</span>
              <span>Observed</span>
            </div>
            {myObservations.data.map((o) => (
              <Link key={o.id} className="table-row table-row-link" role="row" href={`/observations/${o.id}`}>
                <span>{titleCase(o.category)}</span>
                <span>{o.district?.name ?? '—'}</span>
                <span className={`tag ${TRUST_VARIANT[o.trustLevel] ?? 'muted'}`}>
                  {titleCase(o.trustLevel)}
                </span>
                <span>{relativeTime(o.observedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </article>
    </>
      }
      </>
  );
}

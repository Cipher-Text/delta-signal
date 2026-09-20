import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { routes, type MemberDetail } from '@delta-signal/contracts';
import { apiGetAuthed, ApiError } from '../../../../lib/api';
import { titleCase } from '../../../../lib/format';
import { ACCESS_TOKEN_COOKIE } from '../../../../lib/session-constants';
import PageHeader from '../../../../components/page-header';

const ROLE_BADGE_CLASS: Record<string, string> = {
  CITIZEN: 'role-citizen',
  RESEARCHER: 'role-researcher',
  ORGANIZATION_ADMIN: 'role-org-admin',
  GOVERNMENT: 'role-government',
  MODERATOR: 'role-moderator',
  ADMIN: 'role-admin',
};

const SOCIAL_LABEL: Record<string, string> = {
  googleScholar: 'Google Scholar',
  researchGate: 'ResearchGate',
  orcid: 'ORCID',
  linkedin: 'LinkedIn',
  website: 'Website',
  github: 'GitHub',
  facebook: 'Facebook',
};

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function MemberDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';

  let member: MemberDetail;
  try {
    member = await apiGetAuthed<MemberDetail>(routes.members.detail(id), accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const profile = member.profile;
  const badgeCount = profile?.earnedBadges.length ?? 0;
  const points = profile?.contributionPoints ?? 0;

  return (
    <div className="page-stack">
      <Link href="/members" className="text-link" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
        Back to members
      </Link>

      <PageHeader
        eyebrow="Directory"
        title={member.displayName}
        description={[profile?.occupation, profile?.institution].filter(Boolean).join(' · ') || undefined}
      />

      <article className="panel">
        <div className="member-detail-top">
          <div className="member-avatar member-avatar-lg" aria-hidden="true">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials(member.displayName)}
          </div>
          <div className="card-meta">
            <span className={`profile-role-badge ${ROLE_BADGE_CLASS[member.role] ?? 'role-citizen'}`}>
              {titleCase(member.role)}
            </span>
            {profile?.locationDistrict && (
              <span>{profile.locationDistrict}, {profile.locationCountry}</span>
            )}
            <span>Joined {joinedDate(member.createdAt)}</span>
            {points > 0 && <span className="card-badge">{points} pts</span>}
            {badgeCount > 0 && (
              <span className="card-badge card-badge-member">
                {badgeCount} badge{badgeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {profile?.bio && <p style={{ marginTop: '1rem' }}>{profile.bio}</p>}

        {profile?.education && (
          <p className="muted" style={{ marginTop: '0.5rem' }}>{profile.education}</p>
        )}

        {(profile?.expertise.length ?? 0) > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Expertise</h3>
            <div className="tag-list">
              {profile!.expertise.map((e) => <span className="tag muted" key={e}>{e}</span>)}
            </div>
          </div>
        )}

        {(profile?.researchInterests.length ?? 0) > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Research interests</h3>
            <div className="tag-list">
              {profile!.researchInterests.map((r) => <span className="tag muted" key={r}>{r}</span>)}
            </div>
          </div>
        )}

        {member.socialLinks.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Links</h3>
            <div className="tag-list">
              {member.socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="tag info"
                >
                  {SOCIAL_LABEL[link.platform] ?? titleCase(link.platform)}
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

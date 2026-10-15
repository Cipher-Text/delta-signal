import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet, apiGetAuthed } from '../../../../lib/api';
import { ACCESS_TOKEN_COOKIE } from '../../../../lib/session-constants';
import { dhakaDate, pluralize } from '../../../../lib/format';
import { CATEGORIES, STATUSES } from '../../../../lib/restoration-meta';
import NavIcon from '../../../../components/nav-icons';
import OrgLogo from '../../../../components/org-logo';
import { getCurrentUser } from '../../../../lib/current-user';
import { ORG_LINK_LABELS, ORG_LINK_ORDER, canEditOrganization } from '../../../../lib/org-links';

type Organization = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  website: string | null;
  country: string;
  isVerified: boolean;
  logoUrl: string | null;
  photos: Array<{ id: string; url: string; caption: string | null }>;
  socialLinks: Array<{ platform: string; url: string }>;
  createdAt: string;
  updatedAt: string;
  providers: Array<{ id: string; name: string; type: string; isActive: boolean }>;
  memberships: Array<{
    role: string;
    user: { id: string; displayName: string };
  }>;
  restorationProjects: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    impactSummary: string | null;
    district: { id: string; name: string } | null;
    upazila: { id: string; name: string } | null;
    _count: { participants: number; targets: number; activities: number };
    activities: Array<{ title: string; activityDate: string }>;
  }>;
  _count: { memberships: number; restorationProjects: number };
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function OrganizationDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const user = await getCurrentUser();
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  let org: Organization;
  try {
    // Signed-in users get the team list, so their request is never cached or shared; guests get the cached public view.
    org = user && accessToken
      ? await apiGetAuthed<Organization>(`/api/v1/organizations/${params.id}`, accessToken)
      : await apiGet<Organization>(`/api/v1/organizations/${params.id}`, 300);
  } catch {
    notFound();
  }

  // Old id-based links land on the canonical slug URL.
  if (params.id !== org.slug) redirect(`/organizations/${org.slug}`);

  const canEdit = canEditOrganization(user, org.id);
  const projects = [...org.restorationProjects].sort(
    (x, y) => STATUSES.findIndex((st) => st.value === x.status) - STATUSES.findIndex((st) => st.value === y.status),
  );
  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.status] = (counts[p.status] ?? 0) + 1;
  const totalParticipants = projects.reduce((n, p) => n + p._count.participants, 0);

  const links = [...(org.socialLinks ?? [])].sort((x, y) => ORG_LINK_ORDER.indexOf(x.platform) - ORG_LINK_ORDER.indexOf(y.platform));

  const admins = (org.memberships ?? []).filter((m) => m.role === 'ADMIN');
  const members = (org.memberships ?? []).filter((m) => m.role === 'MEMBER');

  return (
    <div className="page-stack">
      <Link href="/organizations" className="text-link" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
        Back to organizations
      </Link>

      <header className="page-heading org-hero">
        <OrgLogo name={org.name} url={org.logoUrl} size="lg" />
        <div>
          <p className="eyebrow">{titleCase(org.type)}</p>
          <h1>{org.name}</h1>
          <div className="card-meta" style={{ marginTop: '0.25rem', gap: '1rem' }}>
            <span>{org.country}</span>
            {org.isVerified && <span style={{ color: 'var(--success)' }}>Verified</span>}
            <span>{org._count.memberships} member{org._count.memberships !== 1 ? 's' : ''}</span>
            <span>{pluralize(org._count.restorationProjects, 'restoration project')}</span>
          </div>
          {canEdit && <Link href={`/organizations/${org.slug}/edit`} className="pf-btn-outline" style={{ marginTop: '0.75rem' }}>Edit profile</Link>}
        </div>
      </header>

      {org.description && (
        <section>
          <p>{org.description}</p>
        </section>
      )}

      {(org.website || links.length > 0) && (
        <ul className="org-links" aria-label="Links">
          {org.website && (
            <li>
              <a href={org.website} target="_blank" rel="noopener noreferrer">Website</a>
            </li>
          )}
          {links.map((l) => (
            <li key={l.platform}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">{ORG_LINK_LABELS[l.platform] ?? titleCase(l.platform)}</a>
            </li>
          ))}
        </ul>
      )}

      {(org.photos ?? []).length > 0 && (
        <section>
          <h2>Photos</h2>
          <ul className="org-gallery">
            {(org.photos ?? []).map((photo) => (
              <li key={photo.id}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption ?? `${org.name} photo`} loading="lazy" />
                  {photo.caption && <figcaption>{photo.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Members: names are for signed-in users only */}
      {!user && org._count.memberships > 0 && (
        <section>
          <h2>Team ({org._count.memberships})</h2>
          <p className="rs-muted">
            <Link href={`/login?next=/organizations/${org.slug}`} className="text-link">Sign in</Link> to see who is on this team.
          </p>
        </section>
      )}
      {user && org.memberships.length > 0 && (
        <section>
          <h2>Team ({org._count.memberships})</h2>
          <div className="content-grid">
            {admins.map((m) => (
              <article className="content-card" key={m.user.id}>
                <div className="card-kicker">Admin</div>
                <h3>{m.user.displayName}</h3>
              </article>
            ))}
            {members.map((m) => (
              <article className="content-card" key={m.user.id}>
                <div className="card-kicker">Member</div>
                <h3>{m.user.displayName}</h3>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Restoration work: the specific projects this organization is running */}
      <section>
        <h2>Restoration work</h2>
        {projects.length === 0 ? (
          <p className="rs-muted">This organization has not registered any restoration projects yet.</p>
        ) : (
          <>
            <p className="rs-muted">
              {STATUSES.filter((st) => counts[st.value]).map((st) => `${counts[st.value]} ${st.label.toLowerCase()}`).join(' · ')}
              {' · '}
              {pluralize(totalParticipants, 'participant')}
            </p>
            <ul className="rs-grid">
              {projects.map((p) => {
                const cat = CATEGORIES.find((c) => c.value === p.category);
                const st = STATUSES.find((x) => x.value === p.status);
                const last = p.activities[0];
                return (
                  <li key={p.id} className="rs-card">
                    <div className="rs-card-tags">
                      <span className={`org-pill org-pill--${cat?.tint ?? 'neutral'}`}>{cat?.label ?? titleCase(p.category)}</span>
                      <span className="rs-status">
                        <span className="rs-dot" data-hollow={st?.hollow ? 'true' : undefined} style={{ ['--dot' as string]: st?.dot }} aria-hidden="true" />
                        {st?.label ?? titleCase(p.status)}
                      </span>
                    </div>
                    <h3><Link href={`/restoration/${p.id}`}>{p.title}</Link></h3>
                    <p className="rs-where">
                      <NavIcon name="locations" />
                      {[p.upazila?.name, p.district?.name].filter(Boolean).join(', ') || 'Location not set'}
                    </p>
                    <p className={`rs-desc${p.description ? '' : ' rs-muted'}`}>{p.description || 'No description yet.'}</p>
                    <div className="rs-meta">
                      <span>{p.startDate ? `Started ${dhakaDate(p.startDate)}` : 'No start date'}{p.endDate ? ` · ends ${dhakaDate(p.endDate)}` : ''}</span>
                      {p.impactSummary && <span><b>Impact:</b> {p.impactSummary}</span>}
                      {last && <span><b>Latest:</b> {last.title} · {dhakaDate(last.activityDate)}</span>}
                    </div>
                    <div className="rs-card-foot">
                      <span className="rs-people"><NavIcon name="members" />{pluralize(p._count.participants, 'participant')}</span>
                      <span className="rs-people">{pluralize(p._count.targets, 'target')} · {pluralize(p._count.activities, 'activity log', 'activity logs')}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Data Providers */}
      {org.providers.length > 0 && (
        <section>
          <h2>Data Providers</h2>
          <div className="content-grid">
            {org.providers.map((provider) => (
              <article className="content-card" key={provider.id}>
                <h3>{provider.name}</h3>
                <div className="card-meta">
                  <span>{titleCase(provider.type)}</span>
                  <span>{provider.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

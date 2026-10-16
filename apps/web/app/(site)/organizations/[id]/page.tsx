import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { routes, type Organization, type OrganizationType, type PaginatedEnvelope } from '@delta-signal/contracts';
import { ApiError, apiGet, apiGetAuthed } from '../../../../lib/api';
import { ACCESS_TOKEN_COOKIE } from '../../../../lib/session-constants';
import { getCurrentUser } from '../../../../lib/current-user';
import { dhakaDate, pluralize } from '../../../../lib/format';
import { CATEGORIES, STATUSES } from '../../../../lib/restoration-meta';
import { ORG_TYPE_META } from '../../../../lib/org-meta';
import { ORG_LINK_LABELS, ORG_LINK_ORDER, canEditOrganization } from '../../../../lib/org-links';
import { domainOf, safeHttpUrl } from '../../../../lib/safe-url';
import NavIcon from '../../../../components/nav-icons';
import OrgLogo from '../../../../components/org-logo';
import { TypePill, VerifiedPill } from '../../../../components/org-pills';

type OrgDetail = Organization & {
  providers: Array<{ id: string; name: string; type: string; isActive: boolean }>;
  memberships: Array<{ role: string; user: { id: string; displayName: string } }>;
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
  photos: Array<{ id: string; url: string; caption: string | null }>;
  socialLinks: Array<{ platform: string; url: string }>;
  _count: { memberships: number; restorationProjects: number };
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Signed-in callers get the team list, so their request is never cached or shared; guests get the cached public view. */
async function loadOrganization(idOrSlug: string, accessToken?: string): Promise<OrgDetail> {
  try {
    return accessToken
      ? await apiGetAuthed<OrgDetail>(routes.organizations.detail(idOrSlug), accessToken)
      : await apiGet<OrgDetail>(routes.organizations.detail(idOrSlug), 300);
  } catch (error) {
    // Only a real "not found" is a 404; an API outage must not tell people the organization does not exist.
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof Error && /: 404 /.test(error.message)) notFound();
    throw error;
  }
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const org = await apiGet<OrgDetail>(routes.organizations.detail(id), 300);
    const description = org.description
      ? org.description.length > 155 ? `${org.description.slice(0, 152).trimEnd()}…` : org.description
      : `${org.name}: ${ORG_TYPE_META[org.type]?.label ?? 'organization'} working on Bangladesh's environment, on Delta Signal.`;
    const image = org.photos?.[0]?.url ?? org.logoUrl ?? undefined;
    return {
      title: `${org.name} — Delta Signal`,
      description,
      alternates: { canonical: `/organizations/${org.slug}` },
      openGraph: { title: org.name, description, type: 'website', ...(image ? { images: [image] } : {}) },
    };
  } catch {
    return { title: 'Organization — Delta Signal' };
  }
}

/** Organization landing page: hero, at-a-glance numbers, about, restoration work, places, photos, team and related organizations. */
export default async function OrganizationLandingPage(props: { params: Promise<{ id: string }> }) {
  const { id: param } = await props.params;
  const user = await getCurrentUser();
  const accessToken = user ? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value : undefined;
  const org = await loadOrganization(param, accessToken);

  // Old id-based links land on the canonical slug URL.
  if (param !== org.slug) redirect(`/organizations/${org.slug}`);

  const canEdit = canEditOrganization(user, org.id);
  const typeMeta = ORG_TYPE_META[org.type as OrganizationType] ?? ORG_TYPE_META.OTHER;
  const website = safeHttpUrl(org.website);
  const links = [...(org.socialLinks ?? [])]
    .sort((x, y) => ORG_LINK_ORDER.indexOf(x.platform) - ORG_LINK_ORDER.indexOf(y.platform))
    .map((l) => ({ ...l, url: safeHttpUrl(l.url) }))
    .filter((l): l is { platform: string; url: string } => l.url !== null);

  const projects = [...org.restorationProjects].sort(
    (x, y) => STATUSES.findIndex((st) => st.value === x.status) - STATUSES.findIndex((st) => st.value === y.status),
  );
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const participants = projects.reduce((n, p) => n + p._count.participants, 0);
  const places = [...new Map(projects.flatMap((p) => (p.district ? [[p.district.id, p.district.name] as const] : []))).entries()].map(([id, name]) => ({ id, name }));
  const focus = [...new Set(projects.map((p) => p.category))].map((c) => CATEGORIES.find((x) => x.value === c) ?? { value: c, label: titleCase(c), tint: 'neutral' });

  const photos = org.photos ?? [];
  const cover = photos[0];
  const gallery = photos.slice(1);
  const members = org.memberships ?? [];

  // Other organizations of the same type, to keep people moving through the directory.
  const related = (
    await apiGet<PaginatedEnvelope<Organization>>(`${routes.organizations.list}?type=${org.type}&pageSize=8`, 300).catch(() => null)
  )?.data.filter((o) => o.id !== org.id).slice(0, 3) ?? [];

  return (
    <div className="orgl">
        <nav aria-label="Breadcrumb" className="orgl-crumbs">
          <Link href="/organizations">Organizations</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{org.name}</span>
        </nav>

        <header className="orgl-hero">
          {cover && (
            <div className="orgl-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.url} alt={cover.caption ?? `${org.name}`} />
            </div>
          )}
          <div className="orgl-hero-body">
            <OrgLogo name={org.name} url={org.logoUrl} size="lg" />
            <div className="orgl-hero-text">
              <div className="orgl-tags">
                <TypePill type={org.type as OrganizationType} />
                {org.isVerified && <VerifiedPill />}
              </div>
              <h1>{org.name}</h1>
              <p className="orgl-meta">
                <span><NavIcon name="globe" />{org.country}</span>
                <span>On Delta Signal since {new Date(org.createdAt).getUTCFullYear()}</span>
              </p>
              {(website || links.length > 0 || canEdit) && (
                <ul className="orgl-actions" aria-label="Links">
                  {website && (
                    <li><a className="button" href={website} target="_blank" rel="noopener noreferrer">Visit {domainOf(website)}</a></li>
                  )}
                  {links.map((l) => (
                    <li key={l.platform}>
                      <a className="orgl-chip" href={l.url} target="_blank" rel="noopener noreferrer">{ORG_LINK_LABELS[l.platform] ?? titleCase(l.platform)}</a>
                    </li>
                  ))}
                  {canEdit && <li><Link className="orgl-chip orgl-chip--edit" href={`/organizations/${org.slug}/edit`}>Edit profile</Link></li>}
                </ul>
              )}
            </div>
          </div>
        </header>

        {projects.length > 0 && (
          <section className="orgl-stats" aria-label="At a glance">
            <div className="orgl-stat"><strong>{projects.length.toLocaleString()}</strong><span>{projects.length === 1 ? 'restoration project' : 'restoration projects'}</span></div>
            <div className="orgl-stat"><strong>{activeCount.toLocaleString()}</strong><span>active now</span></div>
            {participants > 0 && <div className="orgl-stat"><strong>{participants.toLocaleString()}</strong><span>{participants === 1 ? 'participant' : 'participants'}</span></div>}
            {places.length > 0 && <div className="orgl-stat"><strong>{places.length.toLocaleString()}</strong><span>{places.length === 1 ? 'district' : 'districts'}</span></div>}
          </section>
        )}

        <section className="orgl-section" aria-labelledby="about">
          <h2 id="about">About</h2>
          {org.description ? <p className="orgl-about">{org.description}</p> : <p className="orgl-empty">This organization has not added a description yet.</p>}
          {focus.length > 0 && (
            <ul className="orgl-focus" aria-label="Focus areas">
              {focus.map((f) => <li key={f.value} className={`org-pill org-pill--${f.tint}`}>{f.label}</li>)}
            </ul>
          )}
        </section>

        <section className="orgl-section" aria-labelledby="work">
          <h2 id="work">Restoration work</h2>
          {projects.length === 0 ? (
            <p className="orgl-empty">
              No restoration projects are listed for this organization yet. <Link href="/restoration" className="text-link">Browse all restoration projects</Link>.
            </p>
          ) : (
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
          )}
        </section>

        {places.length > 0 && (
          <section className="orgl-section" aria-labelledby="places">
            <h2 id="places">Where they work</h2>
            <ul className="orgl-places">
              {places.map((d) => (
                <li key={d.id}>{user ? <Link href={`/locations/districts/${d.id}`}>{d.name}</Link> : d.name}</li>
              ))}
            </ul>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="orgl-section" aria-labelledby="photos">
            <h2 id="photos">Photos</h2>
            <ul className="org-gallery">
              {gallery.map((photo) => (
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

        {user && members.length > 0 && (
          <section className="orgl-section" aria-labelledby="team">
            <h2 id="team">Team</h2>
            <ul className="orgl-team">
              {[...members].sort((a, b) => (a.role === b.role ? 0 : a.role === 'ADMIN' ? -1 : 1)).map((m) => (
                <li key={m.user.id}>
                  <span className="orgl-avatar" aria-hidden="true">{m.user.displayName.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{m.user.displayName}</strong><small>{m.role === 'ADMIN' ? 'Administrator' : 'Member'}</small></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {org.providers.length > 0 && (
          <section className="orgl-section" aria-labelledby="providers">
            <h2 id="providers">Data it publishes</h2>
            <ul className="orgl-places">
              {org.providers.map((p) => <li key={p.id}>{p.name}<small> · {titleCase(p.type)}{p.isActive ? '' : ' · inactive'}</small></li>)}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="orgl-section" aria-labelledby="more">
            <h2 id="more">Other {typeMeta.plural}</h2>
            <ul className="org-grid orgl-related">
              {related.map((o) => (
                <li key={o.id}>
                  <Link href={`/organizations/${o.slug}`} className="org-card">
                    <span className="org-card-top">
                      <OrgLogo name={o.name} url={o.logoUrl} />
                      <span className="org-card-tags">
                        <TypePill type={o.type} />
                        {o.isVerified && <VerifiedPill />}
                      </span>
                    </span>
                    <h3>{o.name}</h3>
                    {o.description && <p>{o.description}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <p><Link href="/organizations" className="text-link">See all organizations →</Link></p>
          </section>
        )}
    </div>
  );
}

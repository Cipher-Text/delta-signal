import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '../../../../lib/api';

type Organization = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  country: string;
  isVerified: boolean;
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
    category: string;
    status: string;
    district: { id: string; name: string } | null;
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
  let org: Organization;
  try {
    org = await apiGet<Organization>(`/api/v1/organizations/${params.id}`, 300);
  } catch {
    notFound();
  }

  const admins = org.memberships.filter((m) => m.role === 'ADMIN');
  const members = org.memberships.filter((m) => m.role === 'MEMBER');

  return (
    <div className="page-stack">
      <Link href="/organizations" className="text-link" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
        Back to organizations
      </Link>

      <header className="page-heading">
        <p className="eyebrow">{titleCase(org.type)}</p>
        <h1>{org.name}</h1>
        <div className="card-meta" style={{ marginTop: '0.25rem', gap: '1rem' }}>
          <span>{org.country}</span>
          {org.isVerified && <span style={{ color: '#16a34a' }}>Verified</span>}
          <span>{org._count.memberships} member{org._count.memberships !== 1 ? 's' : ''}</span>
          <span>{org._count.restorationProjects} project{org._count.restorationProjects !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {org.description && (
        <section>
          <p>{org.description}</p>
        </section>
      )}

      {org.website && (
        <p>
          <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-link">
            {org.website}
          </a>
        </p>
      )}

      {/* Members */}
      {org.memberships.length > 0 && (
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

      {/* Restoration Projects */}
      {org.restorationProjects.length > 0 && (
        <section>
          <h2>Restoration Projects ({org._count.restorationProjects})</h2>
          <div className="content-grid">
            {org.restorationProjects.map((project) => (
              <Link href={`/restoration/${project.id}`} key={project.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article className="content-card">
                  <div className="card-kicker">{titleCase(project.category)}</div>
                  <h3>{project.title}</h3>
                  <div className="card-meta">
                    <span>{titleCase(project.status)}</span>
                    {project.district && <span>{project.district.name}</span>}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

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

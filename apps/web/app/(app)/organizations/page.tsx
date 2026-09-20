import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/current-user';
import { apiGet, apiGetAuthed } from '../../../lib/api';
import { ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import ListPagination from '../../../components/list-pagination';
import ListResultToolbar from '../../../components/list-result-toolbar';
import PageHeader from '../../../components/page-header';

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
};

type OrgListResponse = {
  data: Organization[];
  total: number;
  page: number;
  pageSize: number;
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ORG_TYPES = [
  { label: 'All', value: '' },
  { label: 'NGO', value: 'NGO' },
  { label: 'Government', value: 'GOVERNMENT_AGENCY' },
  { label: 'Research', value: 'RESEARCH_INSTITUTION' },
  { label: 'International', value: 'INTERNATIONAL_ORG' },
  { label: 'Community', value: 'COMMUNITY_GROUP' },
  { label: 'Corporate', value: 'PRIVATE_COMPANY' },
];

export default async function OrganizationsPage(
  props: {
    searchParams: Promise<{ type?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value ?? '';
  const activeType = searchParams.type ?? '';
  const typeFilter = activeType ? `&type=${encodeURIComponent(activeType)}` : '';
  const page = searchParams.page ?? '1';
  const result = await (user
    ? apiGetAuthed<OrgListResponse>(`/api/v1/organizations?page=${page}&pageSize=20${typeFilter}`, accessToken)
    : apiGet<OrgListResponse>(`/api/v1/organizations?page=${page}&pageSize=20${typeFilter}`));

  const myOrgIds = new Set(user?.organizations.map((o) => o.id) ?? []);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Directory"
        title="Organizations"
        description={`${result.total} organization${result.total !== 1 ? 's' : ''} registered on the platform.`}
      />

      <nav className="tab-nav">
        {ORG_TYPES.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/organizations?type=${t.value}` : '/organizations'}
            className={activeType === t.value ? 'active' : ''}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <ListResultToolbar total={result.total} label="organizations" />

      {result.data.length === 0 ? (
        <section className="empty-state">
          <h2>No organizations found</h2>
          <p>No organizations match this filter.</p>
        </section>
      ) : (
        <div className="content-grid organizations-grid">
          {result.data.map((org) => (
            <Link
              href={`/organizations/${org.id}`}
              key={org.id}
              className="organization-card-link"
              aria-label={`View ${org.name}`}
            >
              <article className="content-card organization-card">
                <div className="organization-card-topline">
                  <div className="card-kicker">{titleCase(org.type)}</div>
                  <span className="organization-card-arrow" aria-hidden="true">→</span>
                </div>
                <h2>{org.name}</h2>
                {org.description && <p>{org.description}</p>}
                <div className="card-meta">
                  <span>{org.country}</span>
                  {org.isVerified && <span className="card-badge">✓ Verified</span>}
                  {myOrgIds.has(org.id) && <span className="card-badge card-badge-member">Member</span>}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      <ListPagination pathname="/organizations" page={result.page} pageSize={result.pageSize} total={result.total} query={{ type: activeType }} />
    </div>
  );
}

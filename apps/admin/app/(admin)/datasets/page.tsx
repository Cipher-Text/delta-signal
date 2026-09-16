import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { togglePublishAction, updateAccessPolicyAction } from '../../../lib/dataset-actions';

type AccessPolicy = 'PUBLIC' | 'LOGIN_REQUIRED' | 'RESEARCHER' | 'APPROVED' | 'GOVERNMENT';
type DatasetCategory = 'WEATHER' | 'AIR_QUALITY' | 'WATER' | 'BIODIVERSITY' | 'MONITORING' | 'REPORTS';

interface Dataset {
  id: string;
  name: string;
  category: DatasetCategory;
  accessPolicy: AccessPolicy;
  source: string;
  description: string;
  recordCount: number | null;
  lastSyncedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  provider: { id: string; name: string; type: string } | null;
}

interface AdminListResponse {
  data: Dataset[];
  total: number;
}

const ACCESS_POLICIES: AccessPolicy[] = [
  'PUBLIC',
  'LOGIN_REQUIRED',
  'RESEARCHER',
  'APPROVED',
  'GOVERNMENT',
];

const POLICY_LABEL: Record<AccessPolicy, string> = {
  PUBLIC: 'Public',
  LOGIN_REQUIRED: 'Login required',
  RESEARCHER: 'Researcher',
  APPROVED: 'Approved only',
  GOVERNMENT: 'Government only',
};

const POLICY_BADGE: Record<AccessPolicy, string> = {
  PUBLIC: 'policy-public',
  LOGIN_REQUIRED: 'policy-login',
  RESEARCHER: 'policy-researcher',
  APPROVED: 'policy-approved',
  GOVERNMENT: 'policy-government',
};

const CATEGORY_BADGE: Record<string, string> = {
  WEATHER: 'cat-weather',
  AIR_QUALITY: 'cat-air',
  WATER: 'cat-water',
  BIODIVERSITY: 'cat-bio',
  MONITORING: 'cat-monitor',
  REPORTS: 'cat-reports',
};

function titleCase(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DatasetsPage(
  props: {
    searchParams: Promise<{ success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';

  const result = await apiGet<AdminListResponse>('/api/v1/datasets/admin', accessToken);

  const publishedCount = result.data.filter((d) => d.isPublished).length;
  const unpublishedCount = result.total - publishedCount;

  return (
    <>
      <div className="page-header">
        <h1>Dataset Catalog</h1>
        <p>
          {publishedCount} published · {unpublishedCount} unpublished · {result.total} total
        </p>
      </div>

      {searchParams.success === 'published' && (
        <div className="flash flash-success">Dataset published — now visible to the public catalog.</div>
      )}
      {searchParams.success === 'unpublished' && (
        <div className="flash flash-success">Dataset unpublished — hidden from the public catalog.</div>
      )}
      {searchParams.success === 'policy' && (
        <div className="flash flash-success">Access policy updated.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      <div className="table-wrapper">
        {result.data.map((dataset) => (
          <div key={dataset.id} className={`dataset-row${!dataset.isPublished ? ' dataset-unpublished' : ''}`}>
            <div className="dataset-row-main">
              <div className="dataset-identity">
                <div className="dataset-name-row">
                  <span className={`badge ${CATEGORY_BADGE[dataset.category] ?? ''}`}>
                    {titleCase(dataset.category)}
                  </span>
                  <span className={`badge ${POLICY_BADGE[dataset.accessPolicy]}`}>
                    {POLICY_LABEL[dataset.accessPolicy]}
                  </span>
                  {!dataset.isPublished && (
                    <span className="badge dataset-draft-badge">Unpublished</span>
                  )}
                  <span className="dataset-name">{dataset.name}</span>
                </div>
                <div className="dataset-desc">{dataset.description}</div>
                <div className="dataset-meta">
                  Source: {dataset.source}
                  {dataset.provider && ` · ${dataset.provider.name}`}
                  {dataset.recordCount != null && ` · ${dataset.recordCount.toLocaleString()} records`}
                  {dataset.lastSyncedAt && ` · synced ${relativeTime(dataset.lastSyncedAt)}`}
                </div>
              </div>

              <div className="dataset-actions">
                {/* Publish / unpublish toggle */}
                <form action={togglePublishAction} className="inline-form">
                  <input type="hidden" name="id" value={dataset.id} />
                  <input
                    type="hidden"
                    name="isPublished"
                    value={dataset.isPublished ? 'false' : 'true'}
                  />
                  <button
                    type="submit"
                    className={`btn btn-sm ${dataset.isPublished ? 'btn-ghost' : 'btn-success'}`}
                  >
                    {dataset.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                </form>

                {/* Access policy selector */}
                <form action={updateAccessPolicyAction} className="role-form">
                  <input type="hidden" name="id" value={dataset.id} />
                  <select
                    name="accessPolicy"
                    className="role-select"
                    defaultValue={dataset.accessPolicy}
                  >
                    {ACCESS_POLICIES.map((p) => (
                      <option key={p} value={p}>
                        {POLICY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Update policy
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

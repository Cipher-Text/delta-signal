import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  createOrganizationAction,
  updateOrganizationAction,
  deleteOrganizationAction,
  upsertMembershipAction,
  updateMembershipAction,
  removeMembershipAction,
} from '../../../lib/organization-actions';

type Organization = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  country: string;
  isVerified: boolean;
  memberships: Array<{
    userId: string;
    role: 'ADMIN' | 'MEMBER';
    user: { id: string; displayName: string; email: string; isActive: boolean };
  }>;
};

type User = { id: string; displayName: string; email: string; isActive: boolean };

const ORG_TYPES = [
  'GOVERNMENT_AGENCY',
  'RESEARCH_INSTITUTION',
  'NGO',
  'COMMUNITY_GROUP',
  'PRIVATE_COMPANY',
  'INTERNATIONAL_ORG',
  'OTHER',
];

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function OrganizationsPage(
  props: {
    searchParams: Promise<{ success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const [organizations, users] = await Promise.all([
    apiGet<Organization[]>('/api/v1/admin/organizations', token),
    apiGet<User[]>('/api/v1/admin/organizations/users', token),
  ]);

  return (
    <>
      <div className="page-header">
        <h1>Organization Management</h1>
        <p>Create, edit, and verify organizations. Manage user memberships.</p>
      </div>
      {searchParams.success && <div className="flash flash-success">Organization updated successfully.</div>}
      {searchParams.error && <div className="flash flash-error">{searchParams.error}</div>}

      {/* ── Create ────────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>Create organization</h2>
        <form action={createOrganizationAction} className="inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input name="name" className="text-input" placeholder="Organization name" required />
          <select name="type" className="role-select" defaultValue="NGO">
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>{titleCase(t)}</option>
            ))}
          </select>
          <input name="website" className="text-input" placeholder="Website (optional)" />
          <input name="country" className="text-input" placeholder="Country (default: Bangladesh)" />
          <input name="description" className="text-input" placeholder="Description (optional)" style={{ minWidth: '240px' }} />
          <button className="btn btn-secondary" type="submit">Create</button>
        </form>
      </section>

      {/* ── Org cards ─────────────────────────────────────────────────────── */}
      <div className="org-management-list">
        {organizations.map((org) => (
          <section className="admin-section" key={org.id}>
            {/* Header */}
            <div className="section-heading-row">
              <div>
                <h2>
                  {org.name}
                  {org.isVerified && <span style={{ color: '#16a34a', marginLeft: '0.5rem', fontSize: '0.875rem' }}>Verified</span>}
                </h2>
                <p>
                  {titleCase(org.type)} · {org.country} · {org.memberships.length} member{org.memberships.length !== 1 ? 's' : ''}
                  {org.website && <> · <a href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a></>}
                </p>
                {org.description && <p style={{ marginTop: '0.25rem', opacity: 0.7 }}>{org.description}</p>}
              </div>
            </div>

            {/* Edit form */}
            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Edit organization</summary>
              <form action={updateOrganizationAction} className="inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="hidden" name="id" value={org.id} />
                <input name="name" className="text-input" placeholder="Name" defaultValue={org.name} required />
                <select name="type" className="role-select" defaultValue={org.type}>
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{titleCase(t)}</option>
                  ))}
                </select>
                <input name="website" className="text-input" placeholder="Website" defaultValue={org.website ?? ''} />
                <input name="country" className="text-input" placeholder="Country" defaultValue={org.country} />
                <input name="description" className="text-input" placeholder="Description" defaultValue={org.description ?? ''} style={{ minWidth: '240px' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                  <input type="hidden" name="isVerified" value="false" />
                  <input
                    type="checkbox"
                    name="isVerified"
                    value="true"
                    defaultChecked={org.isVerified}
                  />
                  Verified
                </label>
                <button className="btn btn-secondary btn-sm" type="submit">Save</button>
              </form>
              <form action={deleteOrganizationAction} style={{ marginTop: '0.5rem' }}>
                <input type="hidden" name="id" value={org.id} />
                <button className="btn btn-danger-outline btn-sm" type="submit">Delete organization</button>
              </form>
            </details>

            {/* Members */}
            <div className="member-list">
              {org.memberships.map((membership) => (
                <div className="member-row" key={membership.userId}>
                  <div><strong>{membership.user.displayName}</strong><span>{membership.user.email}</span></div>
                  <form action={updateMembershipAction} className="inline-form">
                    <input type="hidden" name="organizationId" value={org.id} />
                    <input type="hidden" name="userId" value={membership.userId} />
                    <select name="role" className="role-select" defaultValue={membership.role}>
                      <option value="ADMIN">Organization admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" type="submit">Save</button>
                  </form>
                  <form action={removeMembershipAction}>
                    <input type="hidden" name="organizationId" value={org.id} />
                    <input type="hidden" name="userId" value={membership.userId} />
                    <button className="btn btn-danger-outline btn-sm" type="submit">Remove</button>
                  </form>
                </div>
              ))}
            </div>

            {/* Add member */}
            <form action={upsertMembershipAction} className="inline-form member-add-form">
              <input type="hidden" name="organizationId" value={org.id} />
              <select name="userId" className="role-select" required defaultValue="">
                <option value="" disabled>Attach user</option>
                {users.filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName} · {u.email}</option>
                ))}
              </select>
              <select name="role" className="role-select" defaultValue="MEMBER">
                <option value="ADMIN">Organization admin</option>
                <option value="MEMBER">Member</option>
              </select>
              <button className="btn btn-secondary btn-sm" type="submit">Attach</button>
            </form>
          </section>
        ))}
      </div>
    </>
  );
}

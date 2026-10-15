import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  createOrganizationAction,
  updateOrganizationAction,
  deleteOrganizationAction,
  upsertMembershipAction,
  setOrganizationLogoAction,
  removeOrganizationLogoAction,
  addOrganizationPhotoAction,
  removeOrganizationPhotoAction,
  saveOrganizationLinksAction,
  updateMembershipAction,
  removeMembershipAction,
} from '../../../lib/organization-actions';
import { countryOptions } from '../../../lib/countries';
import { ORG_LINK_LABELS, ORG_LINK_PLATFORMS } from '../../../lib/organization-links';

type Organization = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  country: string;
  isVerified: boolean;
  logoUrl: string | null;
  photos: Array<{ id: string; url: string; caption: string | null }>;
  socialLinks: Array<{ platform: string; url: string }>;
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
          <select name="country" className="role-select" defaultValue="Bangladesh" aria-label="Country">
            {countryOptions().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
                <select name="country" className="role-select" defaultValue={org.country} aria-label="Country">
                  {countryOptions(org.country).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
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

            {/* Logo, photos and links */}
            <details className="org-media" style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Logo, photos and links
                <span className="org-media-count"> · {org.logoUrl ? 'logo set' : 'no logo'} · {org.photos.length}/8 photos · {org.socialLinks.length} links</span>
              </summary>

              <div className="org-media-block">
                <h3>Logo</h3>
                <div className="org-media-logo-row">
                  {org.logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="org-media-logo" src={org.logoUrl} alt={`${org.name} logo`} />
                    : <div className="org-media-logo org-media-logo--empty" aria-hidden="true">{org.name.slice(0, 1)}</div>}
                  <form action={setOrganizationLogoAction} className="inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <input type="hidden" name="id" value={org.id} />
                    <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
                    <button className="btn btn-secondary btn-sm" type="submit">{org.logoUrl ? 'Replace logo' : 'Upload logo'}</button>
                  </form>
                  {org.logoUrl && (
                    <form action={removeOrganizationLogoAction}>
                      <input type="hidden" name="id" value={org.id} />
                      <button className="btn btn-danger-outline btn-sm" type="submit">Remove</button>
                    </form>
                  )}
                </div>
                <p className="org-media-hint">Square or wide images work; JPG, PNG or WebP up to 5 MB. Shown on cards at small size, so a simple mark reads best.</p>
              </div>

              <div className="org-media-block">
                <h3>Photos</h3>
                {org.photos.length > 0 && (
                  <ul className="org-media-photos">
                    {org.photos.map((photo) => (
                      <li key={photo.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.caption ?? 'Organization photo'} />
                        <span>{photo.caption ?? 'No caption'}</span>
                        <form action={removeOrganizationPhotoAction}>
                          <input type="hidden" name="id" value={org.id} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <button className="btn btn-danger-outline btn-sm" type="submit">Remove</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {org.photos.length < 8 ? (
                  <form action={addOrganizationPhotoAction} className="inline-form" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <input type="hidden" name="id" value={org.id} />
                    <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
                    <input name="caption" className="text-input" placeholder="Caption (optional)" maxLength={200} />
                    <button className="btn btn-secondary btn-sm" type="submit">Add photo</button>
                  </form>
                ) : <p className="org-media-hint">The gallery is full (8 photos). Remove one to add another.</p>}
              </div>

              <div className="org-media-block">
                <h3>Links</h3>
                <form action={saveOrganizationLinksAction} className="org-media-links">
                  <input type="hidden" name="id" value={org.id} />
                  {ORG_LINK_PLATFORMS.map((platform) => (
                    <label key={platform}>
                      <span>{ORG_LINK_LABELS[platform]}</span>
                      <input name={platform} className="text-input" type="url" placeholder="https://" defaultValue={org.socialLinks.find((l) => l.platform === platform)?.url ?? ''} />
                    </label>
                  ))}
                  <button className="btn btn-secondary btn-sm" type="submit">Save links</button>
                </form>
                <p className="org-media-hint">Leave a field empty to remove that link. The website is edited above.</p>
              </div>
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

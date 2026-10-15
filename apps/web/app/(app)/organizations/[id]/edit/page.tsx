import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiGet } from '../../../../../lib/api';
import { getCurrentUser } from '../../../../../lib/current-user';
import { ORG_LINK_LABELS, ORG_LINK_ORDER, canEditOrganization } from '../../../../../lib/org-links';
import {
  addOrganizationPhotoAction,
  removeOrganizationLogoAction,
  removeOrganizationPhotoAction,
  saveOrganizationLinksAction,
  setOrganizationLogoAction,
  updateOrganizationAboutAction,
} from '../../../../../lib/organization-actions';
import NavIcon from '../../../../../components/nav-icons';
import { countryOptions } from '../../../../../lib/countries';
import OrgLogo from '../../../../../components/org-logo';
import PageHeader from '../../../../../components/page-header';

type Org = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  country: string;
  logoUrl: string | null;
  photos: Array<{ id: string; url: string; caption: string | null }>;
  socialLinks: Array<{ platform: string; url: string }>;
};

const MAX_PHOTOS = 8;

/** Self-service organization profile: organization ADMIN members (and platform admins) edit details, logo, photos and links. */
export default async function EditOrganizationPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/organizations/${id}/edit`);
  if (!canEditOrganization(user, id)) redirect(`/organizations/${id}`);

  let org: Org;
  try {
    org = await apiGet<Org>(`/api/v1/organizations/${id}`, 0);
  } catch {
    notFound();
  }

  return (
    <div className="page-stack org-edit">
      <Link href={`/organizations/${id}`} className="text-link">Back to profile</Link>
      <PageHeader title="Edit organization profile" description={`${org.name} · name, type, verification and members are managed by the platform team.`} />

      {sp.saved && <div className="pf-notice pf-notice--ok" role="status"><NavIcon name="check" />{sp.saved}</div>}
      {sp.error && <div className="pf-notice pf-notice--err" role="alert">{sp.error}</div>}

      <section className="pf-card org-edit-card">
        <div className="pf-section pf-section--stack">
          <div className="pf-section-head"><h3>Logo</h3><p>JPG, PNG or WebP up to 5 MB. A simple mark reads best at small size.</p></div>
          <div className="org-edit-logo">
            <OrgLogo name={org.name} url={org.logoUrl} size="lg" />
            <form action={setOrganizationLogoAction} className="org-edit-row">
              <input type="hidden" name="id" value={id} />
              <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required aria-label="Logo image" />
              <button type="submit" className="pf-btn-solid">{org.logoUrl ? 'Replace logo' : 'Upload logo'}</button>
            </form>
            {org.logoUrl && (
              <form action={removeOrganizationLogoAction}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="pf-btn-outline">Remove</button>
              </form>
            )}
          </div>
        </div>

        <form action={updateOrganizationAboutAction} className="pf-section pf-section--stack">
          <input type="hidden" name="id" value={id} />
          <div className="pf-section-head"><h3>About</h3><p>Shown on the directory card and your public profile.</p></div>
          <div className="pf-section-body">
            <label className="pf-field pf-field--wide">
              <span>Description</span>
              <textarea name="description" rows={5} maxLength={2000} defaultValue={org.description ?? ''} placeholder="What the organization does and where it works" />
            </label>
            <label className="pf-field">
              <span>Website</span>
              <input name="website" type="url" placeholder="https://" defaultValue={org.website ?? ''} />
              <small>Must start with https:// (or http://). Leave empty to remove.</small>
            </label>
            <label className="pf-field">
              <span>Country</span>
              <select name="country" defaultValue={org.country}>
                {countryOptions(org.country).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div><button type="submit" className="pf-btn-solid">Save details</button></div>
        </form>

        <div className="pf-section pf-section--stack">
          <div className="pf-section-head"><h3>Photos</h3><p>Up to {MAX_PHOTOS} photos of your work, shown on your profile. {org.photos.length}/{MAX_PHOTOS} used.</p></div>
          {org.photos.length > 0 && (
            <ul className="org-gallery">
              {org.photos.map((photo) => (
                <li key={photo.id}>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption ?? `${org.name} photo`} loading="lazy" />
                    <figcaption>{photo.caption ?? 'No caption'}</figcaption>
                  </figure>
                  <form action={removeOrganizationPhotoAction}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button type="submit" className="pf-btn-outline">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {org.photos.length < MAX_PHOTOS ? (
            <form action={addOrganizationPhotoAction} className="org-edit-row">
              <input type="hidden" name="id" value={id} />
              <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required aria-label="Photo" />
              <input name="caption" className="org-edit-caption" maxLength={200} placeholder="Caption (optional)" aria-label="Caption" />
              <button type="submit" className="pf-btn-solid">Add photo</button>
            </form>
          ) : <p className="rs-muted">The gallery is full. Remove a photo to add another.</p>}
        </div>

        <form action={saveOrganizationLinksAction} className="pf-section pf-section--stack">
          <input type="hidden" name="id" value={id} />
          <div className="pf-section-head"><h3>Links</h3><p>One address per platform. Leave a field empty to remove that link.</p></div>
          <div className="pf-section-body">
            {ORG_LINK_ORDER.map((platform) => (
              <label key={platform} className="pf-field">
                <span>{ORG_LINK_LABELS[platform]}</span>
                <input name={platform} type="url" placeholder="https://" defaultValue={org.socialLinks.find((l) => l.platform === platform)?.url ?? ''} />
              </label>
            ))}
          </div>
          <div><button type="submit" className="pf-btn-solid">Save links</button></div>
        </form>
      </section>
    </div>
  );
}

'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { ENVIRONMENTAL_EXPERTISE, ENVIRONMENTAL_RESEARCH_INTERESTS } from '@delta-signal/shared';
import TagInput from '../tag-input';
import NavIcon from '../nav-icons';

import { LINK_PLATFORMS } from '../../lib/profile-links';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };

export interface ProfileFormValues {
  displayName: string;
  email: string;
  phone: string;
  locationDistrict: string;
  country: string;
  occupation: string;
  institution: string;
  education: string;
  bio: string;
  expertise: string[];
  researchInterests: string[];
  links: Record<string, string>;
  profileVisibility: string;
  contactVisibility: string;
  linksVisibility: string;
}

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  values: ProfileFormValues;
  districts: DistrictGroup[];
};

function Section({ title, hint, optional, children }: { title: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <section className="pf-section">
      <div className="pf-section-head">
        <h3>
          {title}
          {optional && <span className="pf-optional">Optional</span>}
        </h3>
        {hint && <p>{hint}</p>}
      </div>
      <div className="pf-section-body">{children}</div>
    </section>
  );
}

function VisibilitySelect({ name, label, value, privateLabel }: { name: string; label: string; value: string; privateLabel: string }) {
  return (
    <label className="pf-field">
      <span>{label}</span>
      <select name={name} defaultValue={value}>
        <option value="PUBLIC">Public</option>
        <option value="MEMBERS_ONLY">Members only</option>
        <option value="PRIVATE">{privateLabel}</option>
      </select>
    </label>
  );
}

/** Professional links: one URL per platform (the server action takes seven fixed keys). */
function LinksEditor({ initial, onDirty }: { initial: Record<string, string>; onDirty: () => void }) {
  const [links, setLinks] = useState<Record<string, string>>(initial);
  const [platform, setPlatform] = useState<string>(LINK_PLATFORMS[0].key);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const rows = LINK_PLATFORMS.filter((p) => links[p.key]);

  function add() {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    } catch {
      setError('Enter a full link starting with https://');
      return;
    }
    setError('');
    setLinks((l) => ({ ...l, [platform]: url.trim() }));
    setUrl('');
    onDirty();
  }

  return (
    <div className="pf-links">
      {LINK_PLATFORMS.map((p) => (
        <input key={p.key} type="hidden" name={p.key} value={links[p.key] ?? ''} />
      ))}
      {rows.length === 0 ? (
        <p className="pf-links-empty">No links yet. Add a research profile so others can find your work.</p>
      ) : (
        <ul className="pf-links-list">
          {rows.map((p) => (
            <li key={p.key}>
              <strong>{p.label}</strong>
              <a href={links[p.key]} target="_blank" rel="noopener noreferrer">{links[p.key]}</a>
              <button
                type="button"
                className="pf-link-btn"
                onClick={() => {
                  setLinks((l) => ({ ...l, [p.key]: '' }));
                  onDirty();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pf-links-add">
        <label className="pf-field">
          <span>Platform</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {LINK_PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="pf-field">
          <span>Link</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button type="button" className="pf-btn-outline" onClick={add}>Add link</button>
      </div>
      {error && <p className="pf-field-error" role="alert">{error}</p>}
    </div>
  );
}

/**
 * The Profile tab form (Web UI Reference): titled sections, and a "You have unsaved changes"
 * bar that appears once something is edited. Discard remounts the form so every field —
 * including the tag and link editors — returns to its saved value.
 */
export default function ProfileForm({ action, values, districts }: Props) {
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  const markDirty = () => setDirty(true);
  const onTagEdit = (e: FormEvent<HTMLFormElement>) => {
    if ((e.target as HTMLElement).closest('.tag-input-box')) setDirty(true);
  };

  return (
    <form
      key={version}
      action={action}
      className="pf-form"
      onInput={markDirty}
      onChange={markDirty}
      onKeyUp={onTagEdit}
      onClick={onTagEdit}
      onSubmit={() => setSaving(true)}
    >
      <input type="hidden" name="_tab" value="personal" />

      <div className="pf-form-head">
        <h2>Personal information</h2>
        <p>Fields are optional unless marked.</p>
      </div>

      <Section title="About you" hint="Shown on your public profile.">
        <label className="pf-field">
          <span>Display name</span>
          <input name="displayName" defaultValue={values.displayName} required autoComplete="name" placeholder="Your name" />
        </label>
        <label className="pf-field">
          <span>Email address</span>
          <span className="pf-readonly"><NavIcon name="lock" />{values.email}</span>
          <small>Managed by your administrator.</small>
        </label>
        <label className="pf-field">
          <span>Phone number</span>
          <input name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" placeholder="+880 1XXX-XXXXXX" />
          <small>Only visible if contact visibility allows it.</small>
        </label>
      </Section>

      <Section title="Location" hint="Personalizes weather, data and alert suggestions. You can still report from any district.">
        <label className="pf-field" id="location">
          <span>Primary district</span>
          <select name="locationDistrict" defaultValue={values.locationDistrict}>
            <option value="">Not specified</option>
            {districts.map((g) => (
              <optgroup key={g.division} label={g.division}>
                {g.districts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {!values.locationDistrict && <small>+20% profile strength</small>}
        </label>
        <label className="pf-field">
          <span>Country</span>
          <span className="pf-readonly">{values.country}</span>
        </label>
      </Section>

      <Section title="Professional details" optional>
        <label className="pf-field">
          <span>Occupation</span>
          <input name="occupation" defaultValue={values.occupation} placeholder="e.g. Field researcher, ecologist" />
        </label>
        <label className="pf-field">
          <span>Institution or employer</span>
          <input name="institution" defaultValue={values.institution} placeholder="e.g. IUCN Bangladesh" />
        </label>
        <label className="pf-field">
          <span>Education</span>
          <input name="education" defaultValue={values.education} placeholder="Degree or qualification" />
        </label>
        <label className="pf-field pf-field--wide">
          <span>Biography</span>
          <textarea name="bio" rows={4} maxLength={500} defaultValue={values.bio} placeholder="A short introduction to you and your environmental work" />
          <small>Up to 500 characters.</small>
        </label>
      </Section>

      <Section title="Expertise and interests" hint="Press Enter or comma to add an item." optional>
        <TagInput
          name="expertise"
          label="Expertise areas"
          initialValues={values.expertise}
          suggestions={ENVIRONMENTAL_EXPERTISE}
          placeholder="e.g. Mangrove ecology, GIS"
        />
        <TagInput
          name="researchInterests"
          label="Research interests"
          initialValues={values.researchInterests}
          suggestions={ENVIRONMENTAL_RESEARCH_INTERESTS}
          placeholder="e.g. Coastal flooding"
        />
      </Section>

      <Section title="Professional links" hint="Research profiles and social accounts." optional>
        <LinksEditor initial={values.links} onDirty={markDirty} />
      </Section>

      <Section title="Privacy" hint="Choose who can see your profile and details.">
        <VisibilitySelect name="profileVisibility" label="Profile" value={values.profileVisibility} privateLabel="Private" />
        <VisibilitySelect name="contactVisibility" label="Contact details" value={values.contactVisibility} privateLabel="Private — hidden" />
        <VisibilitySelect name="linksVisibility" label="Links" value={values.linksVisibility} privateLabel="Private" />
      </Section>

      {dirty && (
        <div className="pf-savebar" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <div>
            <button type="button" className="pf-btn-outline" onClick={() => { setDirty(false); setVersion((v) => v + 1); }} disabled={saving}>
              Discard
            </button>
            <button type="submit" className="pf-btn-solid" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

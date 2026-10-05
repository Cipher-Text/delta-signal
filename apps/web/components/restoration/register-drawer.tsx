'use client';

import { useEffect, useRef, useState } from 'react';
import NavIcon from '../nav-icons';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };

export interface RegisterDrawerProps {
  action: (formData: FormData) => void | Promise<void>;
  categories: { value: string; label: string }[];
  districts: DistrictGroup[];
  organizations: { id: string; name: string }[];
}

/** "Register a project": a button that opens a right-hand drawer with the creation form. */
export default function RegisterDrawer({ action, categories, districts, organizations }: RegisterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [pending, setPending] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setDesc('');
  };
  const enough = desc.trim().length >= 20;

  return (
    <>
      <button type="button" className="rs-register" onClick={() => setOpen(true)}>
        <NavIcon name="plus" />
        Register a project
      </button>

      {open && (
        <div className="rs-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="rs-drawer" role="dialog" aria-modal="true" aria-labelledby="reg-h">
            <div className="rs-drawer-head">
              <div>
                <h2 id="reg-h">Register a restoration project</h2>
                <p>Published projects are visible to everyone.</p>
              </div>
              <button type="button" className="rs-close" onClick={close} aria-label="Close">
                <NavIcon name="close" />
              </button>
            </div>

            <form action={action} className="rs-form" onSubmit={() => setPending(true)}>
              <div className="rs-form-body">
                <label className="pf-field">
                  <span>Title</span>
                  <input ref={first} name="title" required minLength={5} maxLength={200} placeholder="e.g. Sundarbans mangrove buffer restoration" />
                </label>
                <div className="rs-row">
                  <label className="pf-field">
                    <span>Category</span>
                    <select name="category" required defaultValue={categories[0]?.value}>
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="pf-field">
                    <span>District <small>· optional</small></span>
                    <select name="districtId" defaultValue="">
                      <option value="">Not specified</option>
                      {districts.map((g) => (
                        <optgroup key={g.division} label={g.division}>
                          {g.districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="pf-field">
                  <span>Organization <small>· optional</small></span>
                  <select name="organizationId" defaultValue="">
                    <option value="">Not specified</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </label>
                <div className="rs-row">
                  <label className="pf-field">
                    <span>Start date <small>· optional</small></span>
                    <input type="date" name="startDate" />
                  </label>
                  <label className="pf-field">
                    <span>End date <small>· optional</small></span>
                    <input type="date" name="endDate" />
                  </label>
                </div>
                <label className="pf-field">
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows={5}
                    required
                    minLength={20}
                    maxLength={2000}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="What is this project doing, and where?"
                  />
                  <small className={enough ? 'rs-ok' : undefined}>
                    {enough ? `${desc.trim().length} characters` : `At least 20 characters · ${desc.trim().length} so far`}
                  </small>
                </label>
                <label className="pf-field">
                  <span>Impact summary <small>· optional</small></span>
                  <input name="impactSummary" maxLength={500} placeholder="e.g. 40 ha of mangrove replanted" />
                  <small>A short, measurable result once you have one.</small>
                </label>
              </div>
              <div className="rs-drawer-foot">
                <button type="button" className="pf-btn-outline" onClick={close} disabled={pending}>Cancel</button>
                <button type="submit" className="pf-btn-solid" disabled={pending}>{pending ? 'Registering…' : 'Register project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

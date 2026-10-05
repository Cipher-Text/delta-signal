'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import NavIcon from '../nav-icons';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };

const STEPS = ['What', 'Where', 'Details'];
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

/** "Report an issue": a button that opens a three-step drawer (what, where, details). */
export default function ReportDrawer({
  action,
  categories,
  districts,
  signedIn,
  variant = 'solid',
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: { value: string; label: string }[];
  districts: DistrictGroup[];
  signedIn: boolean;
  variant?: 'solid' | 'outline';
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(categories[0]?.value ?? 'OTHER');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locNote, setLocNote] = useState('');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [pending, setPending] = useState(false);
  const title = useRef<HTMLInputElement>(null);

  const btnClass = variant === 'solid' ? 'rp-open' : 'pf-btn-outline';
  const close = () => {
    setOpen(false);
    setStep(1);
    setCoords(null);
    setLocNote('');
    setDesc('');
    setPhotos([]);
    setPhotoError('');
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open && step === 3) title.current?.focus();
  }, [open, step]);

  if (!signedIn) {
    return (
      <Link href="/login?next=/reports" className={btnClass}>
        <NavIcon name="plus" />
        Report an issue
      </Link>
    );
  }

  function useLocation() {
    if (!('geolocation' in navigator)) {
      setLocNote('This browser cannot share a location. Choose a district instead.');
      return;
    }
    setLocNote('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ lat, lng });
        setLocNote(`Location added: ${lat}, ${lng}. Moderators use it to verify the report.`);
      },
      () => setLocNote('Location is unavailable. Choose a district instead.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function pickPhotos(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length > MAX_PHOTOS) return setPhotoError(`Add up to ${MAX_PHOTOS} photos.`);
    if (list.some((f) => f.type !== 'image/jpeg' && f.type !== 'image/png')) return setPhotoError('Photos must be JPG or PNG.');
    if (list.some((f) => f.size > MAX_BYTES)) return setPhotoError('Each photo must be 5 MB or smaller.');
    setPhotoError('');
    setPhotos(list);
  }

  const enough = desc.trim().length >= 20;

  return (
    <>
      <button type="button" className={btnClass} onClick={() => setOpen(true)}>
        <NavIcon name="plus" />
        Report an issue
      </button>

      {open && (
        <div className="rs-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="rs-drawer" role="dialog" aria-modal="true" aria-labelledby="rep-h">
            <div className="rs-drawer-head rp-head">
              <div className="rp-head-row">
                <div>
                  <h2 id="rep-h">Report an environmental issue</h2>
                  <p>A moderator reviews every report before it appears publicly.</p>
                </div>
                <button type="button" className="rs-close" onClick={close} aria-label="Close">
                  <NavIcon name="close" />
                </button>
              </div>
              <ol className="rp-steps" aria-label="Steps">
                {STEPS.map((n, i) => (
                  <li key={n} aria-current={step === i + 1 ? 'step' : undefined} data-done={step > i + 1}>
                    <span />
                    {i + 1}. {n}
                  </li>
                ))}
              </ol>
            </div>

            <form
              action={action}
              className="rs-form"
              onSubmit={() => setPending(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && step < 3) e.preventDefault();
              }}
            >
              <div className="rs-form-body">
                <input type="hidden" name="category" value={category} />
                {coords && (
                  <>
                    <input type="hidden" name="lat" value={coords.lat} />
                    <input type="hidden" name="lng" value={coords.lng} />
                  </>
                )}

                <div hidden={step !== 1} className="rp-step">
                  <span className="rp-q">What did you see?</span>
                  <div className="rp-tiles" role="radiogroup" aria-label="Issue type">
                    {categories.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={category === c.value}
                        className="rp-tile"
                        onClick={() => setCategory(c.value)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div hidden={step !== 2} className="rp-step">
                  <span className="rp-q">Where is it?</span>
                  <label className="pf-field">
                    <span>District</span>
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
                  <button type="button" className="pf-btn-outline rp-loc" onClick={useLocation}>
                    <NavIcon name="locations" />
                    Use my current location
                  </button>
                  <span className={`rp-note${coords ? ' rp-note--ok' : ''}`} role="status">
                    {locNote || 'Optional. An exact location helps moderators verify the report.'}
                  </span>
                </div>

                <div hidden={step !== 3} className="rp-step">
                  <span className="rp-q">Describe it</span>
                  <label className="pf-field">
                    <span>Title</span>
                    <input ref={title} name="title" required minLength={5} maxLength={200} placeholder="e.g. Dark discharge into the river near Hazaribagh" />
                  </label>
                  <label className="pf-field">
                    <span>What happened?</span>
                    <textarea
                      name="description"
                      rows={5}
                      required
                      minLength={20}
                      maxLength={5000}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="What you saw, when, and anything that helps a moderator check it"
                    />
                    <small className={enough ? 'rs-ok' : undefined}>
                      {enough ? `${desc.trim().length} characters` : `At least 20 characters · ${desc.trim().length} so far`}
                    </small>
                  </label>
                  <div className="pf-field">
                    <span>Photos <small>· optional</small></span>
                    <label className="pf-btn-outline rp-photo-btn">
                      {photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected` : 'Add photos · JPG or PNG'}
                      <input type="file" name="photos" accept="image/jpeg,image/png" multiple onChange={(e) => pickPhotos(e.target.files)} />
                    </label>
                    <small>Up to {MAX_PHOTOS} photos, 5 MB each.</small>
                    {photoError && <small className="rp-err" role="alert">{photoError}</small>}
                  </div>
                </div>
              </div>

              <div className="rs-drawer-foot">
                <button
                  type="button"
                  className="pf-btn-outline"
                  onClick={() => (step === 1 ? close() : setStep(step - 1))}
                  disabled={pending}
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </button>
                {step < 3 ? (
                  <button type="button" className="pf-btn-solid" onClick={() => setStep(step + 1)}>Continue</button>
                ) : (
                  <button type="submit" className="pf-btn-solid" disabled={pending || !!photoError}>
                    {pending ? 'Submitting…' : 'Submit report'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import NavIcon from '../nav-icons';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };
type Category = { value: string; label: string; hint: string };

const STEPS = ['What', 'When and where', 'Details'];

/** Current date and time in Bangladesh (UTC+6), as the values <input type="date|time"> expect. */
function dhakaNow() {
  const d = new Date(Date.now() + 6 * 3_600_000);
  const iso = d.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** "Add an observation": a button that opens a three-step drawer (what, when and where, details). */
export default function ObservationDrawer({
  action,
  categories,
  districts,
  signedIn,
  variant = 'solid',
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  districts: DistrictGroup[];
  signedIn: boolean;
  variant?: 'solid' | 'outline';
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(categories[0]?.value ?? 'BIODIVERSITY');
  const [now, setNow] = useState(() => ({ date: '', time: '' }));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locNote, setLocNote] = useState('');
  const [desc, setDesc] = useState('');
  const [pending, setPending] = useState(false);

  const btnClass = variant === 'solid' ? 'rp-open' : 'pf-btn-outline';
  const close = () => {
    setOpen(false);
    setStep(1);
    setCoords(null);
    setLocNote('');
    setDesc('');
  };
  const show = () => {
    setNow(dhakaNow());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!signedIn) {
    return (
      <Link href="/login?next=/observations" className={btnClass}>
        <NavIcon name="plus" />
        Add an observation
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
        setLocNote(`Location added: ${lat}, ${lng}.`);
      },
      () => setLocNote('Location is unavailable. Choose a district instead.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const enough = desc.trim().length >= 20;

  return (
    <>
      <button type="button" className={btnClass} onClick={show}>
        <NavIcon name="plus" />
        Add an observation
      </button>

      {open && (
        <div className="rs-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="rs-drawer" role="dialog" aria-modal="true" aria-labelledby="obs-h">
            <div className="rs-drawer-head rp-head">
              <div className="rp-head-row">
                <div>
                  <h2 id="obs-h">Add an observation</h2>
                  <p>Starts as Unverified until a researcher or admin reviews it.</p>
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
                  <span className="rp-q">What did you observe?</span>
                  <div className="rp-tiles" role="radiogroup" aria-label="Observation type">
                    {categories.map((c) => (
                      <button key={c.value} type="button" role="radio" aria-checked={category === c.value} className="rp-tile ob-tile" onClick={() => setCategory(c.value)}>
                        <span>{c.label}</span>
                        <small>{c.hint}</small>
                      </button>
                    ))}
                  </div>
                  {category === 'BIODIVERSITY' && (
                    <label className="pf-field">
                      <span>Species <small>· optional</small></span>
                      <input name="species" maxLength={100} placeholder="Common or scientific name, e.g. Oriental magpie-robin" />
                      <small>Leave blank if you&apos;re not sure. A reviewer can identify it.</small>
                    </label>
                  )}
                </div>

                <div hidden={step !== 2} className="rp-step">
                  <span className="rp-q">When and where?</span>
                  <div className="rs-row">
                    <label className="pf-field">
                      <span>Date observed</span>
                      <input type="date" name="date" key={now.date} defaultValue={now.date} max={now.date || undefined} required />
                    </label>
                    <label className="pf-field">
                      <span>Time</span>
                      <input type="time" name="time" key={now.time} defaultValue={now.time} required />
                    </label>
                  </div>
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
                    {locNote || 'Optional. An exact location helps reviewers check the observation.'}
                  </span>
                </div>

                <div hidden={step !== 3} className="rp-step">
                  <span className="rp-q">Describe it</span>
                  <label className="pf-field">
                    <span>Description</span>
                    <textarea
                      name="description"
                      rows={6}
                      required
                      minLength={20}
                      maxLength={2000}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="What you saw or measured, how many, and anything that helps a reviewer check it"
                    />
                    <small className={enough ? 'rs-ok' : undefined}>
                      {enough ? `${desc.trim().length} characters` : `At least 20 characters · ${desc.trim().length} so far`}
                    </small>
                  </label>
                </div>
              </div>

              <div className="rs-drawer-foot">
                <button type="button" className="pf-btn-outline" onClick={() => (step === 1 ? close() : setStep(step - 1))} disabled={pending}>
                  {step === 1 ? 'Cancel' : 'Back'}
                </button>
                {step < 3 ? (
                  <button type="button" className="pf-btn-solid" onClick={() => setStep(step + 1)}>Continue</button>
                ) : (
                  <button type="submit" className="pf-btn-solid" disabled={pending}>{pending ? 'Adding…' : 'Add observation'}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

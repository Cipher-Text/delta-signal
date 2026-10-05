'use client';

import { useState } from 'react';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };

const SEVERITIES = [
  { value: 'INFO', label: 'All alerts', desc: 'Info and above', dot: '#3388C7', phrase: 'all alerts' },
  { value: 'WATCH', label: 'Watch and above', desc: 'Skip info notices', dot: '#D9A323', phrase: 'Watch, Warning and Emergency alerts' },
  { value: 'WARNING', label: 'Warning and above', desc: 'Likely to cause harm', dot: '#E67E22', phrase: 'Warning and Emergency alerts' },
  { value: 'EMERGENCY', label: 'Emergency only', desc: 'Act-now alerts only', dot: '#D64545', phrase: 'Emergency alerts only' },
];

/** "Add a subscription": area select, minimum-severity radio cards and a live preview sentence. */
export default function AlertSubscribeForm({
  action,
  districts,
  email,
}: {
  action: (formData: FormData) => void | Promise<void>;
  districts: DistrictGroup[];
  email: string;
}) {
  const [districtId, setDistrictId] = useState('');
  const [severity, setSeverity] = useState('INFO');
  const [pending, setPending] = useState(false);

  const districtName = districts.flatMap((g) => g.districts).find((d) => d.id === districtId)?.name;
  const sev = SEVERITIES.find((s) => s.value === severity) ?? SEVERITIES[0];
  const area = districtName ? `in ${districtName} district` : 'anywhere in Bangladesh';

  return (
    <form action={action} className="pf-subform" onSubmit={() => setPending(true)}>
      <label className="pf-field">
        <span>Area</span>
        <select name="districtId" value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          <option value="">Nationwide</option>
          {districts.map((g) => (
            <optgroup key={g.division} label={g.division}>
              {g.districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <fieldset className="pf-radios">
        <legend>Minimum severity</legend>
        <div role="radiogroup" aria-label="Minimum severity">
          {SEVERITIES.map((s) => (
            <label key={s.value} className="pf-radio" data-checked={severity === s.value}>
              <input type="radio" name="minSeverity" value={s.value} checked={severity === s.value} onChange={() => setSeverity(s.value)} />
              <span className="pf-radio-title">
                <span className="pf-radio-dot" style={{ background: s.dot }} aria-hidden="true" />
                {s.label}
              </span>
              <span className="pf-radio-desc">{s.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="pf-preview">
        You will get an email at <strong>{email}</strong> for {sev.phrase} {area}.
      </p>
      <div>
        <button type="submit" className="pf-btn-solid" disabled={pending}>{pending ? 'Adding…' : 'Add subscription'}</button>
      </div>
    </form>
  );
}

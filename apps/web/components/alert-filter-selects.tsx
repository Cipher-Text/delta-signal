'use client';

import type { ChangeEvent } from 'react';

interface Option { value: string; label: string }

/**
 * Hazard + district selects that apply as soon as they change (no Apply button).
 * Without JavaScript the <noscript> button submits the same GET form.
 */
export default function AlertFilterSelects({
  severity,
  hazard,
  districtId,
  hazards,
  districts,
}: {
  severity?: string;
  hazard?: string;
  districtId?: string;
  hazards: Option[];
  districts: Option[];
}) {
  const apply = (e: ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

  return (
    <form className="alerts-selects" method="get" action="/alerts" aria-label="Alert filters">
      {severity && <input type="hidden" name="severity" value={severity} />}
      <label>
        Hazard
        <select key={hazard ?? ''} name="alertType" className="select-field" defaultValue={hazard ?? ''} onChange={apply}>
          <option value="">All hazards</option>
          {hazards.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label>
        District
        <select key={districtId ?? ''} name="districtId" className="select-field" defaultValue={districtId ?? ''} onChange={apply}>
          <option value="">All districts</option>
          {districts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <noscript><button type="submit" className="button">Apply</button></noscript>
    </form>
  );
}

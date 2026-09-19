import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  approveSocialDraftAction,
  archiveSocialDraftAction,
  createSocialDraftAction,
  downloadSocialDraftAction,
  markSocialDraftPublishedAction,
  renderSocialDraftAction,
  updateSocialDraftAction,
} from '../../../lib/social-content-actions';

type Draft = {
  id: string;
  type: string;
  status: string;
  format: string;
  locale: string;
  headline: string;
  summary: string | null;
  caption: string | null;
  disclaimer: string | null;
  sourceLabel: string;
  sourceObservedAt: string | null;
  publishedAt: string | null;
  district: { id: string; name: string; bnName: string | null } | null;
  renderedAssets: { publicUrl: string; format: string; width: number; height: number }[];
};

type District = { id: string; name: string; division?: { name: string } };
type AlertOption = { id: string; title: string; severity: string; district: { name: string } | null };
type OccurrenceOption = { id: string; species: { canonicalName: string }; district: { name: string } | null; observedAt: string | null };
type StationOption = { station: { id: string; name: string; riverName: string; districtId: string | null } };

const TYPES = [
  ['CURRENT_WEATHER', 'Current Weather'],
  ['WEATHER_FORECAST', 'Weather Forecast'],
  ['RIVER_SIGNAL', 'River / Discharge Signal'],
  ['ENVIRONMENTAL_ALERT', 'Environmental Alert'],
  ['BIODIVERSITY_OBSERVATION', 'Biodiversity Observation'],
] as const;

function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function date(value: string | null) { return value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }

export default async function SocialContentPage(props: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const [drafts, districts, alerts, occurrences, stations] = await Promise.all([
    apiGet<Draft[]>('/api/v1/social-content/drafts', accessToken),
    apiGet<District[]>('/api/v1/locations/districts', accessToken),
    apiGet<{ data: AlertOption[] }>('/api/v1/alerts?status=ACTIVE&pageSize=100', accessToken).catch(() => ({ data: [] })),
    apiGet<{ data: OccurrenceOption[] }>('/api/v1/biodiversity/occurrences?pageSize=100', accessToken).catch(() => ({ data: [] })),
    apiGet<StationOption[]>('/api/v1/flood/forecast', accessToken).catch(() => []),
  ]);
  return <>
    <div className="page-header">
      <h1>Social Content</h1>
      <p>Create reviewed, source-traceable environmental cards for external social channels.</p>
    </div>
    {params.success && <div className="flash flash-success">Social draft {params.success}.</div>}
    {params.error && <div className="flash flash-error">{params.error}</div>}

    <details className="create-panel" open>
      <summary className="create-panel-summary"><span className="create-panel-label">+ Create Post</span><span className="create-panel-hint">Manual source selection — publishing is not automatic</span></summary>
      <div className="create-panel-body">
        <form action={createSocialDraftAction} className="social-form">
          <div className="form-row">
            <div className="field field-grow"><label htmlFor="type">Content type</label><select id="type" name="type" className="role-select" required>{TYPES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></div>
            <div className="field field-grow"><label htmlFor="districtId">District</label><select id="districtId" name="districtId" className="role-select" required><option value="">Select district</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}{district.division ? ` — ${district.division.name}` : ''}</option>)}</select></div>
            <div className="field field-fixed"><label htmlFor="format">Format</label><select id="format" name="format" className="role-select"><option value="PORTRAIT_4_5">4:5 portrait</option><option value="SQUARE_1_1">1:1 square</option></select></div>
          </div>
          <div className="form-row"><div className="field field-grow"><label htmlFor="sourceId">Source record <span className="field-optional">(alerts/species only)</span></label><select id="sourceId" name="sourceId" className="role-select"><option value="">Automatic/latest source</option><optgroup label="Active alerts">{alerts.data.map((alert) => <option key={alert.id} value={alert.id}>{alert.title} · {alert.severity}</option>)}</optgroup><optgroup label="Biodiversity occurrences">{occurrences.data.map((occurrence) => <option key={occurrence.id} value={occurrence.id}>{occurrence.species.canonicalName} · {occurrence.district?.name ?? 'Unknown district'}</option>)}</optgroup></select></div><div className="field field-grow"><label htmlFor="stationId">River station <span className="field-optional">(river cards only)</span></label><select id="stationId" name="stationId" className="role-select"><option value="">Select station</option>{stations.map((item) => <option key={item.station.id} value={item.station.id}>{item.station.riverName} · {item.station.name}</option>)}</select></div><div className="field field-fixed"><label htmlFor="locale">Language</label><select id="locale" name="locale" className="role-select"><option value="en">English</option><option value="bn">Bengali</option></select></div></div>
          <div className="form-row"><div className="field field-grow"><label htmlFor="headline">Headline <span className="field-optional">(optional — generated from source)</span></label><input id="headline" name="headline" className="filter-input" maxLength={200} /></div><div className="field field-grow"><label htmlFor="disclaimer">Disclaimer <span className="field-optional">(optional — source default used)</span></label><input id="disclaimer" name="disclaimer" className="filter-input" maxLength={500} /></div></div>
          <div className="field"><label htmlFor="summary">Summary <span className="field-optional">(optional)</span></label><textarea id="summary" name="summary" rows={2} className="note-input" /></div>
          <div className="field"><label htmlFor="caption">Caption <span className="field-optional">(optional)</span></label><textarea id="caption" name="caption" rows={3} className="note-input" /></div>
          <div className="form-actions"><button type="submit" className="btn btn-primary">Create draft</button><p className="form-actions-note">Source values are loaded server-side and remain traceable to the selected record.</p></div>
        </form>
      </div>
    </details>

    <div className="social-draft-list">
      {drafts.length === 0 ? <div className="empty-state">No social drafts yet.</div> : drafts.map((draft) => <article className="social-draft-card" key={draft.id}>
        <div className="social-draft-main">
          <div className="social-draft-heading"><span className={`tag ${draft.status === 'APPROVED' ? 'tag-success' : draft.status === 'ARCHIVED' ? 'tag-muted' : 'tag-info'}`}>{label(draft.status)}</span><span className="badge badge-info">{label(draft.type)}</span><h2>{draft.headline}</h2></div>
          <p className="social-draft-meta">{draft.district?.name ?? 'Bangladesh'} · {draft.sourceLabel} · source as of {date(draft.sourceObservedAt)} · {draft.format === 'SQUARE_1_1' ? '1:1' : '4:5'}</p>
          <form action={updateSocialDraftAction} className="social-edit-form"><input type="hidden" name="id" value={draft.id} /><div className="form-row"><div className="field field-grow"><label>Headline</label><input name="headline" defaultValue={draft.headline} className="filter-input" /></div><div className="field field-fixed"><label>Language</label><select name="locale" defaultValue={draft.locale} className="role-select"><option value="en">English</option><option value="bn">Bengali</option></select></div><div className="field field-fixed"><label>Format</label><select name="format" defaultValue={draft.format} className="role-select"><option value="PORTRAIT_4_5">4:5</option><option value="SQUARE_1_1">1:1</option></select></div></div><textarea name="summary" defaultValue={draft.summary ?? ''} rows={2} className="note-input" placeholder="Summary" /><textarea name="caption" defaultValue={draft.caption ?? ''} rows={2} className="note-input" placeholder="Caption" /><input name="disclaimer" defaultValue={draft.disclaimer ?? ''} className="filter-input" placeholder="Disclaimer" /><div className="form-actions"><button className="btn btn-secondary" type="submit" disabled={draft.status === 'APPROVED' || draft.status === 'ARCHIVED'}>Save edits</button></div></form>
          {draft.renderedAssets[0] && <div className="social-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.renderedAssets[0].publicUrl} alt={`Preview of ${draft.headline}`} />
            <div><strong>Rendered preview</strong><p>{draft.renderedAssets[0].width}×{draft.renderedAssets[0].height} SVG · deterministic template</p></div>
          </div>}
          <div className="social-actions"><form action={renderSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-secondary" type="submit" disabled={draft.status === 'APPROVED' || draft.status === 'ARCHIVED'}>Generate card</button></form>{draft.status === 'RENDERED' && <form action={approveSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-success" type="submit">Approve</button></form>}{draft.status === 'APPROVED' && <form action={downloadSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-primary" type="submit">Download</button></form>}{draft.status === 'APPROVED' && <form action={markSocialDraftPublishedAction}><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="note" value="Marked published externally by admin" /><button className="btn btn-ghost" type="submit">Mark published</button></form>}<form action={archiveSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-ghost" type="submit">Archive</button></form></div>
        </div>
      </article>)}
    </div>
  </>;
}

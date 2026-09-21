import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import {
  approveSocialDraftAction,
  archiveSocialDraftAction,
  connectFacebookAction,
  createSocialDraftAction,
  disconnectPlatformAction,
  downloadSocialDraftAction,
  markSocialDraftPublishedAction,
  publishSocialDraftAction,
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
  publications: {
    id: string;
    status: string;
    externalUrl: string | null;
    error: string | null;
    createdAt: string;
    platformAccount: { id: string; platform: string; displayName: string };
  }[];
};

type PlatformAccount = { id: string; platform: string; displayName: string; status: string };

type District = { id: string; name: string; division?: { name: string } };
type AlertOption = { id: string; title: string; severity: string; district: { name: string } | null };
type OccurrenceOption = { id: string; species: { canonicalName: string }; district: { name: string } | null; observedAt: string | null };
type StationOption = { station: { id: string; name: string; riverName: string; districtId: string | null } };
type NationalSuggestion = {
  id: string;
  cadence: string;
  series: string;
  headline: string;
  reason: string;
  quality: string;
  sourceLabel: string;
  windowStart: string;
  windowEnd: string;
  coverage: { available: number; expected: number; percentage: number };
  sourceSnapshot: { rows: Record<string, unknown>[] };
};

const TYPES = [
  ['CURRENT_WEATHER', 'Today in Bangladesh — current conditions'],
  ['WEATHER_FORECAST', 'Rain Watch — forecast conditions'],
  ['RIVER_SIGNAL', 'River Watch — station/discharge signal'],
  ['ENVIRONMENTAL_ALERT', 'Alert Explainer — active alert'],
  ['BIODIVERSITY_OBSERVATION', 'Wild Bangladesh — species observation'],
  ['NATIONAL_RAIN_WATCH', 'Bangladesh Rain Watch — ranked districts'],
  ['NATIONAL_AIR_QUALITY_WATCH', 'Bangladesh Air Quality Watch — modeled PM2.5'],
  ['NATIONAL_HEAT_WATCH', 'Bangladesh Heat Watch — apparent temperature'],
  ['NATIONAL_RIVER_WATCH', 'River Watch Bangladesh — ranked stations'],
  ['NATIONAL_ALERT_WATCH', 'Bangladesh Alert Watch — active alerts'],
  ['NATIONAL_COMMUNITY_SIGNALS', 'Community Signals Bangladesh — verified reports'],
  ['NATIONAL_BIODIVERSITY', 'Wild Bangladesh — recent observations'],
] as const;

function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
const SERIES_LABELS: Record<string, string> = {
    CURRENT_WEATHER: 'Today in Bangladesh',
    WEATHER_FORECAST: 'Rain Watch',
    RIVER_SIGNAL: 'River Watch',
    ENVIRONMENTAL_ALERT: 'Alert Explainer',
    BIODIVERSITY_OBSERVATION: 'Wild Bangladesh',
    NATIONAL_RAIN_WATCH: 'Bangladesh Rain Watch',
    NATIONAL_AIR_QUALITY_WATCH: 'Bangladesh Air Quality Watch',
    NATIONAL_HEAT_WATCH: 'Bangladesh Heat Watch',
    NATIONAL_RIVER_WATCH: 'River Watch Bangladesh',
    NATIONAL_ALERT_WATCH: 'Bangladesh Alert Watch',
    NATIONAL_COMMUNITY_SIGNALS: 'Community Signals Bangladesh',
    NATIONAL_BIODIVERSITY: 'Wild Bangladesh',
};
function seriesLabel(value: string) {
  return SERIES_LABELS[value] ?? label(value);
}
const NATIONAL_TYPE_BY_SERIES: Record<string, string> = {
  RAIN_WATCH: 'NATIONAL_RAIN_WATCH',
  AIR_QUALITY_WATCH: 'NATIONAL_AIR_QUALITY_WATCH',
  HEAT_WATCH: 'NATIONAL_HEAT_WATCH',
  RIVER_WATCH: 'NATIONAL_RIVER_WATCH',
  ALERT_WATCH: 'NATIONAL_ALERT_WATCH',
  COMMUNITY_SIGNALS: 'NATIONAL_COMMUNITY_SIGNALS',
  WILD_BANGLADESH: 'NATIONAL_BIODIVERSITY',
};
function date(value: string | null) { return value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }

export default async function SocialContentPage(props: { searchParams: Promise<{ success?: string; error?: string; status?: string }> }) {
  const params = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const selectedStatus = params.status && ['DRAFT', 'RENDERED', 'APPROVED', 'ARCHIVED'].includes(params.status) ? params.status : undefined;
  const [drafts, districts, alerts, occurrences, stations, suggestions, platformAccounts] = await Promise.all([
    apiGet<Draft[]>(`/api/v1/social-content/drafts${selectedStatus ? `?status=${selectedStatus}` : ''}`, accessToken),
    apiGet<District[]>('/api/v1/locations/districts', accessToken),
    apiGet<{ data: AlertOption[] }>('/api/v1/alerts?status=ACTIVE&pageSize=100', accessToken).catch(() => ({ data: [] })),
    apiGet<{ data: OccurrenceOption[] }>('/api/v1/biodiversity/occurrences?pageSize=100', accessToken).catch(() => ({ data: [] })),
    apiGet<StationOption[]>('/api/v1/flood/forecast', accessToken).catch(() => []),
    apiGet<NationalSuggestion[]>('/api/v1/social-content/suggestions/national?cadence=DAILY', accessToken).catch(() => []),
    apiGet<PlatformAccount[]>('/api/v1/social-content/platforms', accessToken).catch(() => []),
  ]);
  return <>
    <div className="page-header">
      <h1>Social Content</h1>
      <p>Create reviewed, source-traceable environmental cards for external social channels.</p>
    </div>
    {params.success && <div className="flash flash-success">Social draft {params.success}.</div>}
    {params.error && <div className="flash flash-error">{params.error}</div>}

    <section className="social-suggestions">
      <div className="section-heading"><div><h2>Connected Accounts</h2><p>Publish approved cards directly to a connected Facebook Page.</p></div></div>
      {platformAccounts.length === 0 ? <div className="empty-state">No platform accounts connected yet.</div> : <ul className="social-ranking-list">{platformAccounts.map((account) => <li key={account.id}><strong>{account.displayName}</strong><span>{label(account.platform)}<form action={disconnectPlatformAction} style={{ display: 'inline', marginLeft: '0.75rem' }}><input type="hidden" name="id" value={account.id} /><button className="btn btn-ghost" type="submit">Disconnect</button></form></span></li>)}</ul>}
      <div className="form-actions"><form action={connectFacebookAction}><button className="btn btn-secondary" type="submit">Connect Facebook Page</button></form></div>
    </section>

    <section className="social-suggestions">
      <div className="section-heading"><div><h2>Suggested Posts</h2><p>Live national rankings from current environmental data. Suggestions require editorial review.</p></div><span className="tag tag-info">Daily window</span></div>
      {suggestions.length === 0 ? <div className="empty-state">No current national suggestions meet the data requirements.</div> : <div className="social-suggestion-grid">{suggestions.map((suggestion) => <article className="social-suggestion-card" key={suggestion.id}>
        <div className="social-suggestion-top"><span className="badge badge-info">{suggestion.series.replaceAll('_', ' ')}</span><span className={`tag ${suggestion.quality === 'HIGH' ? 'tag-success' : 'tag-info'}`}>{suggestion.quality}</span></div>
        <h3>{suggestion.headline}</h3>
        <p>{suggestion.reason}</p>
        <p className="social-draft-meta">{suggestion.sourceLabel} · {suggestion.coverage.available}/{suggestion.coverage.expected} covered ({suggestion.coverage.percentage}%)</p>
        <ol className="social-ranking-list">{suggestion.sourceSnapshot.rows.slice(0, 5).map((row, index) => <li key={`${suggestion.id}-${index}`}><strong>{index + 1}. {String(row.district ?? row.station ?? row.species ?? row.title ?? 'Bangladesh')}</strong><span>{String(row.rainfallMm ?? row.pm25 ?? row.apparentTemperature ?? row.discharge ?? row.severity ?? row.category ?? '')}</span></li>)}</ol>
        <div className="form-actions"><form action={createSocialDraftAction}><input type="hidden" name="type" value={NATIONAL_TYPE_BY_SERIES[suggestion.series] ?? ''} /><input type="hidden" name="cadence" value={suggestion.cadence} /><input type="hidden" name="format" value="PORTRAIT_4_5" /><input type="hidden" name="locale" value="en" /><button className="btn btn-primary" type="submit" disabled={!NATIONAL_TYPE_BY_SERIES[suggestion.series]}>Create Post from Suggestion</button></form><span className="form-actions-note">Review source evidence before approval.</span></div>
      </article>)}</div>}
    </section>

    <details className="create-panel">
      <summary className="create-panel-summary"><span className="create-panel-label">+ Create Post</span><span className="create-panel-hint">Manual source selection — publishing is not automatic</span></summary>
      <div className="create-panel-body">
        <form action={createSocialDraftAction} className="social-form">
          <div className="form-row">
            <div className="field field-grow"><label htmlFor="type">Content type</label><select id="type" name="type" className="role-select" required>{TYPES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></div>
            <div className="field field-grow"><label htmlFor="districtId">District <span className="field-optional">(required for local cards)</span></label><select id="districtId" name="districtId" className="role-select"><option value="">Bangladesh / national</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}{district.division ? ` — ${district.division.name}` : ''}</option>)}</select></div>
            <div className="field field-fixed"><label htmlFor="cadence">Window</label><select id="cadence" name="cadence" className="role-select"><option value="DAILY">24 hours</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">30 days</option></select></div>
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

    <section className="social-drafts-section">
      <div className="section-heading"><div><h2>Drafts</h2><p>Open a draft only when you need to edit, preview, or approve it.</p></div></div>
      <nav className="social-status-tabs" aria-label="Draft status filter">
        {[['', 'All'], ['DRAFT', 'Drafts'], ['RENDERED', 'Ready for approval'], ['APPROVED', 'Approved'], ['ARCHIVED', 'Archived']].map(([value, text]) => <a className={!selectedStatus && !value || selectedStatus === value ? 'active' : ''} href={value ? `/social-content?status=${value}` : '/social-content'} key={value || 'all'}>{text}</a>)}
      </nav>
      <div className="social-draft-list">
      {drafts.length === 0 ? <div className="empty-state">No social drafts in this view.</div> : drafts.map((draft) => <details className="social-draft-card" key={draft.id} open={drafts.length === 1}>
        <summary className="social-draft-summary"><div className="social-draft-heading"><span className={`tag ${draft.status === 'APPROVED' ? 'tag-success' : draft.status === 'ARCHIVED' ? 'tag-muted' : 'tag-info'}`}>{label(draft.status)}</span><span className="badge badge-info">{seriesLabel(draft.type)}</span><h2>{draft.headline}</h2></div><p className="social-draft-meta">{draft.district?.name ?? 'Bangladesh'} · {draft.sourceLabel} · source as of {date(draft.sourceObservedAt)} · {draft.format === 'SQUARE_1_1' ? '1:1' : '4:5'}</p></summary>
        <div className="social-draft-main">
          <form action={updateSocialDraftAction} className="social-edit-form"><input type="hidden" name="id" value={draft.id} /><div className="form-row"><div className="field field-grow"><label>Headline</label><input name="headline" defaultValue={draft.headline} className="filter-input" /></div><div className="field field-fixed"><label>Language</label><select name="locale" defaultValue={draft.locale} className="role-select"><option value="en">English</option><option value="bn">Bengali</option></select></div><div className="field field-fixed"><label>Format</label><select name="format" defaultValue={draft.format} className="role-select"><option value="PORTRAIT_4_5">4:5</option><option value="SQUARE_1_1">1:1</option></select></div></div><textarea name="summary" defaultValue={draft.summary ?? ''} rows={2} className="note-input" placeholder="Summary" /><textarea name="caption" defaultValue={draft.caption ?? ''} rows={2} className="note-input" placeholder="Caption" /><input name="disclaimer" defaultValue={draft.disclaimer ?? ''} className="filter-input" placeholder="Disclaimer" /><div className="form-actions"><button className="btn btn-secondary" type="submit" disabled={draft.status === 'APPROVED' || draft.status === 'ARCHIVED'}>Save edits</button></div></form>
          {draft.renderedAssets[0] && <div className="social-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={draft.renderedAssets[0].format === 'SQUARE_1_1' ? 'social-preview-square' : ''} src={draft.renderedAssets[0].publicUrl} alt={`Preview of ${draft.headline}`} />
            <div><strong>Rendered preview</strong><p>{draft.renderedAssets[0].width}×{draft.renderedAssets[0].height} PNG · deterministic template</p></div>
          </div>}
          <div className="social-actions"><form action={renderSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-secondary" type="submit" disabled={draft.status === 'APPROVED' || draft.status === 'ARCHIVED'}>Generate card</button></form>{draft.status === 'RENDERED' && <form action={approveSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-success" type="submit">Approve</button></form>}{draft.status === 'APPROVED' && <form action={downloadSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-primary" type="submit">Download</button></form>}{draft.status === 'APPROVED' && platformAccounts.length > 0 && <form action={publishSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><select name="platformAccountId" className="role-select" required defaultValue="">{platformAccounts.map((account) => <option key={account.id} value={account.id}>{account.displayName}</option>)}</select><button className="btn btn-primary" type="submit">Publish</button></form>}{draft.status === 'APPROVED' && <form action={markSocialDraftPublishedAction}><input type="hidden" name="id" value={draft.id} /><input type="hidden" name="note" value="Marked published externally by admin" /><button className="btn btn-ghost" type="submit">Mark published</button></form>}<form action={archiveSocialDraftAction}><input type="hidden" name="id" value={draft.id} /><button className="btn btn-ghost" type="submit">Archive</button></form></div>
          {draft.publications.length > 0 && <ul className="social-ranking-list">{draft.publications.map((pub) => <li key={pub.id}><strong>{pub.platformAccount.displayName}</strong><span className={`tag ${pub.status === 'SENT' ? 'tag-success' : pub.status === 'FAILED' ? 'tag-danger' : 'tag-info'}`}>{pub.status}</span>{pub.status === 'SENT' && pub.externalUrl && <a href={pub.externalUrl} target="_blank" rel="noreferrer"> View post</a>}{pub.status === 'FAILED' && pub.error && <span className="social-draft-meta"> {pub.error}</span>}</li>)}</ul>}
        </div>
      </details>)}
      </div>
    </section>
  </>;
}

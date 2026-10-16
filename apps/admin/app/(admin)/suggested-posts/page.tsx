import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { createSocialDraftAction } from '../../../lib/social-content-actions';
import { saveAutopostAction, toggleAutopostAction } from '../../../lib/autopost-actions';
import { CADENCES, isNotable, label, nationalType, rowValue, shortDate, summaryLines, type NationalSuggestion } from '../../../lib/suggestions';
import {
  CONTENT_OPTIONS,
  DAY_NAMES,
  DAY_ORDER,
  FIRST_HOUR,
  LAST_HOUR,
  MIN_GAP_HOURS,
  POSITION_NAMES,
  formatBst,
  type AutopostConfig,
  type AutopostPreview,
  type AutopostRun,
} from '../../../lib/autopost';

type Params = { tab?: string; cadence?: string; preview?: string; position?: string; saved?: string; error?: string; success?: string };

const RUN_STATUS: Record<string, { text: string; tone: string }> = {
  SENT: { text: 'Posted', tone: 'ok' },
  PENDING: { text: 'Posting…', tone: 'info' },
  FAILED: { text: 'Failed', tone: 'bad' },
  SKIPPED: { text: 'Skipped', tone: 'muted' },
};

function runOutcome(run: AutopostRun) {
  if (run.status === 'QUEUED') return RUN_STATUS[run.publication?.status ?? 'PENDING'];
  return run.status === 'FAILED' ? RUN_STATUS.FAILED : RUN_STATUS.SKIPPED;
}

export default async function SuggestedPostsPage(props: { searchParams: Promise<Params> }) {
  const params = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const me = await apiGet<{ role: string }>('/api/v1/auth/profile', accessToken).catch(() => ({ role: '' }));
  const isAdmin = me.role === 'ADMIN';
  // Administrators land on the routine; everyone else only sees the suggestions.
  const tab = isAdmin && params.tab !== 'suggestions' ? 'routine' : 'suggestions';
  const cadence = ['DAILY', 'WEEKLY', 'MONTHLY'].includes(params.cadence ?? '') ? (params.cadence as string) : 'DAILY';

  const [config, preview, suggestions, suggestionsFailed] = await Promise.all([
    isAdmin && tab === 'routine' ? apiGet<AutopostConfig>('/api/v1/social-content/autopost/config', accessToken).catch(() => null) : Promise.resolve(null),
    isAdmin && tab === 'routine' && params.preview !== undefined
      ? apiGet<AutopostPreview>(`/api/v1/social-content/autopost/preview?day=${Number(params.preview)}&position=${Number(params.position ?? 0)}`, accessToken).catch(() => null)
      : Promise.resolve(null),
    tab === 'suggestions' ? apiGet<NationalSuggestion[]>(`/api/v1/social-content/suggestions/national?cadence=${cadence}`, accessToken).catch(() => null) : Promise.resolve([]),
    Promise.resolve(false),
  ]);
  void suggestionsFailed;
  const tabHref = (t: string) => `/suggested-posts?tab=${t}`;

  return <>
    <div className="page-header">
      <h1>Suggested Posts</h1>
      <p>Live rankings from current environmental data{isAdmin ? ', and the weekly routine that posts them for you' : ''}.</p>
    </div>
    {params.saved && <div className="flash flash-success">{params.saved}.</div>}
    {params.success && <div className="flash flash-success">Draft {params.success}. Open it in <Link href="/social-content">Social Content</Link> to render and approve it.</div>}
    {params.error && <div className="flash flash-error">{params.error}</div>}

    {isAdmin && (
      <nav className="social-status-tabs ap-tabs" aria-label="Suggested posts sections">
        <Link href={tabHref('routine')} className={tab === 'routine' ? 'active' : ''}>Auto-post routine</Link>
        <Link href={tabHref('suggestions')} className={tab === 'suggestions' ? 'active' : ''}>Suggestions</Link>
      </nav>
    )}
    {!isAdmin && <p className="ap-hint">Automatic posting is set up by administrators. Create a post from any suggestion below and review it in Social Content.</p>}

    {tab === 'routine' && isAdmin && (config ? <Routine config={config} preview={preview} previewDay={params.preview} previewPosition={Number(params.position ?? 0)} /> : <div className="empty-state">The auto-post settings could not be loaded. Try again in a moment.</div>)}

    {tab === 'suggestions' && <Suggestions suggestions={suggestions} cadence={cadence} isAdmin={isAdmin} />}
  </>;
}

/** Plain 24-hour hour and minute selects, limited to the hours posts may go out (06–21). */
function TimePicker({ name, value, label: aria }: { name: string; value: string; label: string }) {
  const [hh, mm] = value.split(':');
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => String(FIRST_HOUR + i).padStart(2, '0'));
  if (!hours.includes(hh)) hours.unshift(hh);
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  if (!minutes.includes(mm)) minutes.push(mm);
  minutes.sort();
  return (
    <fieldset className="ap-mini ap-timefield">
      <legend>Time (BST)</legend>
      <span className="ap-time">
        <select name={`${name}_hour`} defaultValue={hh} aria-label={`${aria} hour`}>
          {hours.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <b aria-hidden="true">:</b>
        <select name={`${name}_minute`} defaultValue={mm} aria-label={`${aria} minute`}>
          {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </span>
    </fieldset>
  );
}

// ─── Auto-post routine ───────────────────────────────────────────────────────

function Routine({ config, preview, previewDay, previewPosition }: { config: AutopostConfig; preview: AutopostPreview | null; previewDay?: string; previewPosition: number }) {
  const state = !config.enabled ? 'off' : config.runtimeActive ? 'on' : 'paused';
  const enabledPosts = config.slots.filter((s) => s.enabled).length;
  const slotAt = (day: number, position: number) => config.slots.find((s) => s.dayOfWeek === day && s.position === position)!;
  const pageName = config.platformAccount?.displayName;

  return <div className="ap-stack">
    <section className={`ap-status ap-status--${state}`} aria-labelledby="ap-status-title">
      <div className="ap-status-main">
        <span className="ap-dot" aria-hidden="true" />
        <div>
          <h2 id="ap-status-title">{state === 'off' ? 'Auto-posting is off' : state === 'paused' ? 'Auto-posting is on, but paused here' : 'Auto-posting is on'}</h2>
          <p>
            {state === 'off' && (enabledPosts ? `${enabledPosts} ${enabledPosts === 1 ? 'post is' : 'posts are'} scheduled each week. Nothing will be posted until you turn it on.` : 'Choose your posts and times below, then turn it on.')}
            {state !== 'off' && <>Posting to <strong>{pageName ?? 'no page'}</strong>{config.nextRunAt ? <> · next post <strong>{formatBst(config.nextRunAt)}</strong></> : ' · no post is scheduled'}</>}
          </p>
        </div>
      </div>
      {config.enabled ? (
        <form action={toggleAutopostAction}><input type="hidden" name="enabled" value="false" /><button className="btn btn-secondary" type="submit">Turn off</button></form>
      ) : (
        <details className="ap-turn-on">
          <summary className="btn btn-primary">Turn on auto-posting</summary>
          <form action={toggleAutopostAction} className="ap-confirm">
            <input type="hidden" name="enabled" value="true" />
            {config.accounts.length > 0 && (
              <label className="ap-field">
                <span>Post to</span>
                <select name="platformAccountId" defaultValue={config.platformAccount?.id ?? (config.accounts.length === 1 ? config.accounts[0].id : '')} required>
                  <option value="" disabled>Choose a page…</option>
                  {config.accounts.map((a) => <option key={a.id} value={a.id}>{a.displayName} · {label(a.platform)}</option>)}
                </select>
              </label>
            )}
            <label className="ap-check"><input type="checkbox" name="acknowledged" required /><span>I understand that posts are published to {pageName ? <strong>{pageName}</strong> : 'the page'} automatically, without anyone reviewing them first.</span></label>
            <button className="btn btn-primary" type="submit">Turn on</button>
          </form>
        </details>
      )}
    </section>

    {!config.runtimeActive && (
      <div className="ap-notice ap-notice--warn" role="status">
        <strong>This environment will not post.</strong> Automatic posting only runs in production, so a development copy can never publish to the real page. You can still set up and preview the routine here.
      </div>
    )}
    {config.accountMissing && <div className="ap-notice ap-notice--bad" role="alert"><strong>The page you chose is no longer connected.</strong> Reconnect it in <Link href="/social-content">Social Content</Link> and choose it again.</div>}

    <form action={saveAutopostAction} className="ap-card">
      <div className="ap-card-head">
        <div><h2>Weekly schedule</h2><p>Times are Bangladesh time (BST). Up to three posts a day, at least {MIN_GAP_HOURS} hours apart, between {String(FIRST_HOUR).padStart(2, '0')}:00 and {LAST_HOUR + 1}:00. A post that could not run on time is skipped, never sent late.</p></div>
      </div>

      <div className="ap-fields">
        <label className="ap-field">
          <span>Post to</span>
          {config.accounts.length ? (
            <select name="platformAccountId" defaultValue={config.platformAccount?.id ?? ''}>
              <option value="">Choose a page…</option>
              {config.accounts.map((a) => <option key={a.id} value={a.id}>{a.displayName} · {label(a.platform)}</option>)}
            </select>
          ) : <span className="ap-muted">No page connected yet. <Link href="/social-content">Connect a Facebook Page</Link> first.</span>}
        </label>
        <label className="ap-field ap-field--wide">
          <span>Caption ending <em>(hashtags, added to every post)</em></span>
          <input name="captionFooter" defaultValue={config.captionFooter} maxLength={280} placeholder="#DeltaSignal #Bangladesh" />
        </label>
      </div>

      <ul className="ap-days">
        {DAY_ORDER.map((day) => {
          const posts = [0, 1, 2].map((position) => slotAt(day, position));
          const count = posts.filter((p) => p.enabled).length;
          return (
            <li key={day} className={`ap-day${count ? ' is-on' : ''}`}>
              <div className="ap-day-name"><strong>{DAY_NAMES[day]}</strong><small>{count ? `${count} ${count === 1 ? 'post' : 'posts'}` : 'No posts'}</small></div>
              <div className="ap-posts">
                {posts.map((slot) => {
                  const key = `day${day}_p${slot.position}`;
                  return (
                    <div key={slot.position} className={`ap-post${slot.enabled ? ' is-on' : ''}`}>
                      <div className="ap-post-head">
                        <label className="ap-switch" aria-label={`${POSITION_NAMES[slot.position]} on ${DAY_NAMES[day]}`}>
                          <input type="checkbox" name={`${key}_enabled`} defaultChecked={slot.enabled} />
                          <span className="ap-switch-track" aria-hidden="true" />
                        </label>
                        <div className="ap-post-name"><strong>{POSITION_NAMES[slot.position]}</strong><small>{slot.enabled && config.enabled && slot.nextRunAt ? `Next ${formatBst(slot.nextRunAt)}` : slot.enabled ? 'Scheduled' : 'Off'}</small></div>
                      </div>
                      <div className="ap-day-fields">
                        <TimePicker name={key} value={slot.timeOfDay} label={`${DAY_NAMES[day]} ${POSITION_NAMES[slot.position].toLowerCase()}`} />
                        <label className="ap-mini"><span>Post</span>
                          <select name={`${key}_content`} defaultValue={slot.content}>{CONTENT_OPTIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
                        </label>
                        <label className="ap-mini ap-mini--small"><span>Shape</span>
                          <select name={`${key}_format`} defaultValue={slot.format}><option value="PORTRAIT_4_5">Portrait</option><option value="SQUARE_1_1">Square</option></select>
                        </label>
                        <Link className="ap-preview-link" href={`/suggested-posts?tab=routine&preview=${day}&position=${slot.position}#preview`}>Preview</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <details className="ap-help">
        <summary>How the routine chooses what to post</summary>
        <ul>
          <li><strong>Best available</strong> prefers a notable card (heat, unhealthy air, heavy rain or rough seas past a hazard level, high or low river flow, a cold spell, clean air). Otherwise it leans on forecasts (rain, heat, coast) before noon and on air quality and heat from noon, avoiding what was posted yesterday.</li>
          <li><strong>Only when notable</strong> posts nothing on routine days. A card is never posted twice in a day, so a later post is skipped when nothing different is available. The third post works well as &quot;Only when notable&quot;.</li>
          <li>Only suggestions with complete data are posted. Alerts are never posted automatically.</li>
          <li>Each post is created, rendered and approved for you, then published. Every attempt is recorded below for 7 days.</li>
        </ul>
      </details>

      <div className="ap-savebar">
        <p>{enabledPosts ? `${enabledPosts} ${enabledPosts === 1 ? 'post' : 'posts'} scheduled a week` : 'No post scheduled yet'}. Saving never posts right away.</p>
        <button className="btn btn-primary" type="submit">Save schedule</button>
      </div>
    </form>

    {previewDay !== undefined && (
      <section id="preview" className="ap-card ap-preview" aria-live="polite">
        <div className="ap-card-head"><div><h2>Preview · {DAY_NAMES[Number(previewDay)] ?? 'Day'} · {POSITION_NAMES[previewPosition] ?? 'Post'}</h2><p>What this post would be if it ran right now. Nothing is posted.</p></div><Link className="btn btn-ghost" href="/suggested-posts?tab=routine">Close</Link></div>
        {!preview ? <p className="ap-muted">The preview could not be loaded.</p>
          : !preview.wouldPost ? <p className="ap-muted"><strong>Nothing would be posted.</strong> {preview.reason}.</p>
          : <>
              <p><strong>{preview.headline}</strong> <span className="ap-muted">· {label(preview.series)}{preview.notable ? ' · Notable' : ''}</span></p>
              <pre className="ap-caption">{preview.caption}</pre>
            </>}
      </section>
    )}

    <section className="ap-card" aria-labelledby="ap-history">
      <div className="ap-card-head"><div><h2 id="ap-history">Recent runs</h2><p>The last 7 days. Older history is deleted automatically.</p></div></div>
      {config.runs.length === 0 ? <div className="empty-state">No runs yet. They appear here once a scheduled time passes.</div> : (
        <ul className="ap-runs">
          {config.runs.map((run) => {
            const outcome = runOutcome(run);
            return (
              <li key={run.id}>
                <span className={`ap-chip ap-chip--${outcome.tone}`}>{outcome.text}</span>
                <div className="ap-run-body">
                  <strong>{run.headline ?? (run.series ? label(run.series) : 'No post')}</strong>
                  <small>{formatBst(run.scheduledFor)} · {POSITION_NAMES[run.position]?.toLowerCase() ?? 'post'}{run.series ? ` · ${label(run.series)}` : ''}</small>
                  {(run.reason || run.publication?.error) && <small className="ap-run-reason">{run.reason ?? run.publication?.error}</small>}
                </div>
                {run.publication?.externalUrl && <a href={run.publication.externalUrl} target="_blank" rel="noopener noreferrer" className="ap-run-link">View post</a>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  </div>;
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

function Suggestions({ suggestions, cadence, isAdmin }: { suggestions: NationalSuggestion[] | null; cadence: string; isAdmin: boolean }) {
  return <section className="social-suggestions ap-suggestions">
    <div className="section-heading">
      <div><h2>Suggestions</h2><p>Live national rankings. Create a post from any card and review it in Social Content.</p></div>
      <nav className="social-status-tabs" aria-label="Suggestion window">{CADENCES.map(([value, text]) => <Link className={cadence === value ? 'active' : ''} href={`/suggested-posts?tab=suggestions&cadence=${value}`} key={value}>{text}</Link>)}</nav>
    </div>
    {suggestions === null ? <div className="empty-state">Suggestions could not be loaded. Try again in a moment.</div>
      : suggestions.length === 0 ? <div className="empty-state">No {cadence.toLowerCase()} suggestions meet the data requirements right now.</div>
      : <div className="social-suggestion-grid">{suggestions.map((suggestion) => <article className="social-suggestion-card" key={suggestion.id}>
        <div className="social-suggestion-top"><span className="badge badge-info">{label(suggestion.series)}</span>{isNotable(suggestion) && <span className="tag tag-warning">Notable</span>}<span className={`tag ${suggestion.quality === 'HIGH' ? 'tag-success' : suggestion.quality === 'REVIEW' ? 'tag-warning' : 'tag-danger'}`}>{suggestion.quality === 'HIGH' ? 'Ready' : suggestion.quality === 'REVIEW' ? 'Partial data' : 'Too little data'}</span></div>
        <h3>{suggestion.headline}</h3>
        <p>{suggestion.reason}</p>
        <p className="social-draft-meta">{suggestion.sourceLabel} · {shortDate(suggestion.windowStart)} – {shortDate(suggestion.windowEnd)} · {suggestion.coverage.available}/{suggestion.coverage.expected} covered ({suggestion.coverage.percentage}%)</p>
        {suggestion.series === 'PERIOD_SUMMARY'
          ? <ul className="social-ranking-list">{summaryLines(suggestion.sourceSnapshot.rows[0] ?? {}).map((line) => <li key={line}><span>{line}</span></li>)}</ul>
          : <ol className="social-ranking-list">{suggestion.sourceSnapshot.rows.slice(0, 5).map((row, index) => <li key={`${suggestion.id}-${index}`}><strong>{index + 1}. {String(row.district ?? row.station ?? row.species ?? row.title ?? 'Bangladesh')}</strong><span>{rowValue(suggestion.series, row)}</span></li>)}</ol>}
        <div className="form-actions"><form action={createSocialDraftAction}><input type="hidden" name="type" value={nationalType(suggestion.series)} />{suggestion.direction === 'LOWEST' && <input type="hidden" name="variant" value="LOWEST" />}<input type="hidden" name="cadence" value={suggestion.cadence} /><input type="hidden" name="format" value="PORTRAIT_4_5" /><input type="hidden" name="locale" value="en" /><input type="hidden" name="returnTo" value="/suggested-posts?tab=suggestions" /><button className="btn btn-primary" type="submit" disabled={!nationalType(suggestion.series)}>Create post from suggestion</button></form></div>
      </article>)}</div>}
  </section>;
}

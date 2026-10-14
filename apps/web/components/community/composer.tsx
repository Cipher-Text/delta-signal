'use client';

import Link from 'next/link';
import { useState } from 'react';

type DistrictGroup = { division: string; districts: { id: string; name: string }[] };

/**
 * "Share an update, ask a question or start a poll": a collapsed bar that opens into the composer.
 * Polls are limited to moderators and admins by the API, so the Poll toggle only appears for them.
 */
export default function Composer({
  action,
  districts,
  initials,
  canPoll,
}: {
  action: (formData: FormData) => void | Promise<void>;
  districts: DistrictGroup[];
  initials: string;
  canPoll: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'post' | 'poll'>('post');
  const [optCount, setOptCount] = useState(2);
  const [pending, setPending] = useState(false);
  const poll = kind === 'poll';

  if (!open) {
    return (
      <button type="button" className="cm-compose-bar" onClick={() => setOpen(true)}>
        <span className="cm-avatar" aria-hidden="true">{initials}</span>
        <span>{canPoll ? 'Share an update, ask a question or start a poll' : 'Share an update or ask a question'}</span>
      </button>
    );
  }

  return (
    <form action={action} className="cm-composer" onSubmit={() => setPending(true)}>
      <div className="cm-composer-head">
        <h2>New post</h2>
        {canPoll && (
          <div className="dt-seg" role="group" aria-label="Post type">
            {(['post', 'poll'] as const).map((k) => (
              <button key={k} type="button" className="cm-kind" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === 'post' ? 'Discussion' : 'Poll'}
              </button>
            ))}
          </div>
        )}
      </div>

      {poll ? (
        <>
          <label className="pf-field">
            <span>Question</span>
            <input name="pollQuestion" required minLength={5} maxLength={500} placeholder="e.g. How often do you see plastic waste near waterways?" />
          </label>
          <label className="pf-field">
            <span>Details (optional)</span>
            <textarea name="body" rows={3} minLength={10} maxLength={10000} placeholder="Add context for voters" />
          </label>
          <div className="cm-options">
            <span className="cm-options-label">Options <small>· 2 to 4</small></span>
            {Array.from({ length: optCount }, (_, i) => (
              <input
                key={i}
                name={`pollOption${i}`}
                required={i < 2}
                maxLength={200}
                aria-label={`Option ${i + 1}`}
                placeholder={`Option ${i + 1}${i < 2 ? '' : ' (optional)'}`}
              />
            ))}
            {optCount < 4 && (
              <button type="button" className="pf-link-btn cm-add" onClick={() => setOptCount((n) => Math.min(4, n + 1))}>
                + Add option
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <label className="pf-field">
            <span>Title</span>
            <input name="title" required minLength={3} maxLength={300} placeholder="e.g. New mangrove planting near the Sundarbans" />
          </label>
          <label className="pf-field">
            <span>What would you like to share?</span>
            <textarea name="body" rows={3} required minLength={10} maxLength={10000} placeholder="Details, links or questions" />
          </label>
        </>
      )}

      <div className="cm-composer-row">
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
        {poll && (
          <label className="pf-field">
            <span>Closes <small>· optional</small></span>
            <input type="datetime-local" name="pollEndsAt" />
          </label>
        )}
      </div>

      <p className="cm-hint">
        Seen pollution or flooding? <Link href="/reports">Submit a citizen report</Link> instead, so it can be verified and mapped.
      </p>
      <div className="cm-composer-actions">
        <button type="button" className="pf-btn-outline" onClick={() => { setOpen(false); setKind('post'); setOptCount(2); }} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="pf-btn-solid" disabled={pending}>
          {pending ? 'Publishing…' : poll ? 'Publish poll' : 'Publish'}
        </button>
      </div>
    </form>
  );
}

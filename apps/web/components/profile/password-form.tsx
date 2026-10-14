'use client';

import { useState } from 'react';

function Eye({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off && <path d="M3 3l18 18" />}
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Change-password form with a show/hide toggle and a live rule checklist; submit stays off until valid. */
export default function PasswordForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [shown, setShown] = useState(false);
  const [pending, setPending] = useState(false);

  const okLen = next.length >= 8 && next.length <= 128;
  const okMatch = next.length > 0 && next === conf;
  const okDiff = next.length > 0 && next !== cur;
  const valid = !!cur && okLen && okMatch && okDiff;
  const type = shown ? 'text' : 'password';

  const field = (id: string, label: string, value: string, set: (v: string) => void, auto: string, toggle?: boolean) => (
    <label className="pf-field" htmlFor={id}>
      <span>{label}</span>
      <span className="pf-pw">
        <input id={id} name={id} type={type} value={value} onChange={(e) => set(e.target.value)} autoComplete={auto} required maxLength={128} />
        {toggle && (
          <button type="button" className="pf-pw-toggle" aria-label={shown ? 'Hide passwords' : 'Show passwords'} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
            <Eye off={shown} />
          </button>
        )}
      </span>
    </label>
  );

  const rule = (ok: boolean, text: string) => (
    <li data-ok={ok}>
      <span aria-hidden="true">{ok ? '✓' : '○'}</span>
      {text}
      <span className="sr-only">{ok ? ' — met' : ' — not met yet'}</span>
    </li>
  );

  return (
    <form action={action} className="pf-pwform" onSubmit={() => setPending(true)}>
      <div className="pf-pwrow">{field('currentPassword', 'Current password', cur, setCur, 'current-password', true)}</div>
      <div className="pf-pwrow pf-pwrow--2">
        {field('newPassword', 'New password', next, setNext, 'new-password')}
        {field('confirmPassword', 'Confirm new password', conf, setConf, 'new-password')}
      </div>
      <ul className="pf-rules" aria-label="Password rules">
        {rule(okLen, '8 to 128 characters')}
        {rule(okMatch, 'New passwords match')}
        {rule(okDiff, 'Different from your current password')}
      </ul>
      <div>
        <button type="submit" className="pf-btn-solid" disabled={!valid || pending}>{pending ? 'Changing…' : 'Change password'}</button>
      </div>
    </form>
  );
}

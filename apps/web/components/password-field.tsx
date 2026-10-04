'use client';

import { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  name: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
  onInput?: () => void;
}

/** Password input with the accessible show/hide control required by DESIGN.md §3.3. */
export default function PasswordField({ id, name, autoComplete, invalid, describedBy, onInput }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="auth-password">
      <input
        id={id}
        name={name}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        className="auth-input"
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
        onInput={onInput}
      />
      <button
        type="button"
        className="auth-password-toggle"
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        onClick={() => setShown((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {shown ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

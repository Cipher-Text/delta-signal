'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import PasswordField from './password-field';

type Errors = { email?: string; password?: string };

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <div id={id} className="auth-field-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="auth-submit" type="submit" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

/**
 * Sign-in form. Field errors are validated on the client (inline, below each field);
 * a valid form posts to the `loginAction` Server Action, whose failures come back as
 * an account-level alert rendered by the page.
 */
export default function LoginForm({
  action,
  next,
}: {
  action: (formData: FormData) => void | Promise<void>;
  next?: string;
}) {
  const [errors, setErrors] = useState<Errors>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const found: Errors = {};
    if (!email) found.email = 'Enter your email address.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) found.email = 'Enter an email address like name@example.org.';
    if (!password) found.password = 'Enter your password.';

    if (found.email || found.password) {
      e.preventDefault();
      setErrors(found);
      const first = found.email ? 'login-email' : 'login-password';
      (e.currentTarget.querySelector(`#${first}`) as HTMLInputElement | null)?.focus();
    }
  }

  const clear = (field: keyof Errors) => () => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="auth-fields">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.org"
          className="auth-input"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          onInput={clear('email')}
        />
        {errors.email && <FieldError id="login-email-error" message={errors.email} />}
      </div>

      <div className="auth-field">
        <div className="auth-field-head">
          <label htmlFor="login-password">Password</label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <PasswordField
          id="login-password"
          name="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          describedBy={errors.password ? 'login-password-error' : undefined}
          onInput={clear('password')}
        />
        {errors.password && <FieldError id="login-password-error" message={errors.password} />}
      </div>

      <label className="auth-check">
        <input type="checkbox" name="remember" defaultChecked />
        Keep me signed in on this device
      </label>

      <SubmitButton />
    </form>
  );
}

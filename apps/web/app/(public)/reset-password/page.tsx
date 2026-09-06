import Link from 'next/link';
import { resetPasswordAction } from '../../../lib/auth-actions';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const { token, error } = searchParams;

  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <div className="auth-brand">
            <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={36} height={36} />
            <span>Delta Signal</span>
          </div>

          <div className="panel auth-panel-card">
            <div className="panel-header">
              <div>
                <h2>Invalid reset link</h2>
                <p>
                  This link is missing a reset token. Request a new one from
                  the password reset page.
                </p>
              </div>
            </div>
            <p className="auth-switch">
              <Link href="/forgot-password">Request a new link</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={36} height={36} />
          <span>Delta Signal</span>
        </div>

        <div className="panel auth-panel-card">
          <div className="panel-header">
            <div>
              <h2>Choose a new password</h2>
              <p>Enter your new password below. The link expires in 1 hour.</p>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <form action={resetPasswordAction} className="auth-form">
            {/* Token is passed as a hidden field — it came from the URL and is
                already in browser history, so keeping it here is no worse. */}
            <input type="hidden" name="token" value={token} />
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
              />
              <span className="field-hint">At least 8 characters</span>
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
              />
            </div>
            <button className="button button-full" type="submit">
              Reset password
            </button>
          </form>

          <p className="auth-switch">
            Remember your password? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

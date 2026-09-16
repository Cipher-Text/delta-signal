/**
 * Email verification page — placed outside the (public) and (app) route groups
 * so it works for both authenticated and unauthenticated users. The (public)
 * layout redirects logged-in users away, which would break the flow for someone
 * who registers and then immediately clicks their verification email.
 *
 * The token is consumed on page load (Server Component), which is the standard
 * one-click verification UX. Second visits will show the "already used" error.
 */
import Link from 'next/link';
import { apiPost, ApiError } from '../../lib/api';

export default async function VerifyEmailPage(
  props: {
    searchParams: Promise<{ token?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { token } = searchParams;

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
                <h2>Invalid verification link</h2>
                <p>
                  This link is missing a token. Use the link sent to your
                  email, or request a new one from your profile.
                </p>
              </div>
            </div>
            <p className="auth-switch">
              <Link href="/profile?tab=security">Go to security settings</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  let verified = false;
  let errorMessage = '';

  try {
    await apiPost('/api/v1/auth/verify-email', { token });
    verified = true;
  } catch (err) {
    errorMessage =
      err instanceof ApiError
        ? err.message
        : 'Verification failed. The link may have expired or already been used.';
  }

  if (verified) {
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
                <h2>Email verified</h2>
                <p>Your email address has been confirmed. You&apos;re all set.</p>
              </div>
            </div>
            <p className="auth-switch">
              <Link href="/reports">Continue to Delta Signal</Link>
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
              <h2>Verification failed</h2>
              <p>{errorMessage}</p>
            </div>
          </div>
          <p className="auth-switch">
            <Link href="/profile?tab=security">Request a new verification email</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

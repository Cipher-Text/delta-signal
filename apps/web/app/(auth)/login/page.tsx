import Link from 'next/link';
import { loginAction } from '../../../lib/auth-actions';
import { INVALID_CREDENTIALS } from '../../../lib/session-constants';
import AuthSplit from '../../../components/auth-split';
import LoginForm from '../../../components/login-form';

// Never hardcode the seed password — it must come from the build-time env var
// so that production builds (which don't set NEXT_PUBLIC_SEED_PASSWORD) cannot
// accidentally embed it in the JS bundle even if the seed panel is shown.
const SEED_PASSWORD = process.env.NEXT_PUBLIC_SEED_PASSWORD ?? '';
const SEED_USERS = [
  { email: 'citizen@deltasignal.org', label: 'Citizen' },
  { email: 'researcher@deltasignal.org', label: 'Researcher' },
  { email: 'organization.admin@deltasignal.org', label: 'Organization Admin' },
  { email: 'government@deltasignal.org', label: 'Government' },
  { email: 'moderator@deltasignal.org', label: 'Moderator' },
  { email: 'admin@deltasignal.org', label: 'Admin' },
];

// Generic on purpose: must not reveal whether the email has an account (DESIGN.md §3.3).
const INVALID_CREDENTIALS_COPY =
  'That email and password don\u2019t match an account. Check them and try again, or reset your password.';

export default async function LoginPage(
  props: {
    searchParams: Promise<{ error?: string; message?: string; next?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const showSeedLogin = process.env.NEXT_PUBLIC_ENABLE_SEED_LOGIN === 'true';
  const errorText =
    searchParams.error === INVALID_CREDENTIALS ? INVALID_CREDENTIALS_COPY : searchParams.error;

  return (
    <AuthSplit>
      <div className="auth-heading">
        <h1>Sign in</h1>
        <p>
          New to Delta Signal? <Link href="/register">Create a free account</Link>
        </p>
      </div>

      {/* Google OAuth — browser navigates to /auth/google which proxies to the API */}
      <a href="/auth/google" className="auth-google">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </a>

      <div className="auth-or" role="separator" aria-label="or">
        <span />
        or sign in with email
        <span />
      </div>

      {errorText && (
        <div className="auth-alert" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
          <span>{errorText}</span>
        </div>
      )}
      {searchParams.message && (
        <div className="auth-status" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span>{searchParams.message}</span>
        </div>
      )}

      <LoginForm action={loginAction} next={searchParams.next} />

      {showSeedLogin && (
        <section className="seed-login">
          <p className="seed-login-title">Seed accounts</p>
          <div className="seed-login-grid">
            {SEED_USERS.map((user) => (
              <form key={user.email} action={loginAction}>
                <input type="hidden" name="email" value={user.email} />
                <input type="hidden" name="password" value={SEED_PASSWORD} />
                <input type="hidden" name="remember" value="on" />
                <button className="seed-login-button" type="submit">
                  <span>{user.label}</span>
                  <small>{user.email}</small>
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </AuthSplit>
  );
}

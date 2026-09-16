import Link from 'next/link';
import { forgotPasswordAction } from '../../../lib/auth-actions';

export default async function ForgotPasswordPage(
  props: {
    searchParams: Promise<{ sent?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  if (searchParams.sent) {
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
                <h2>Check your inbox</h2>
                <p>
                  If that email is registered you will receive a reset link
                  shortly. The link expires in 1 hour.
                </p>
              </div>
            </div>
            <p className="auth-switch">
              <Link href="/login">Back to sign in</Link>
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
              <h2>Reset your password</h2>
              <p>Enter your email and we&apos;ll send you a reset link.</p>
            </div>
          </div>

          <form action={forgotPasswordAction} className="auth-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <button className="button button-full" type="submit">
              Send reset link
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

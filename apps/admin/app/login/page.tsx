import { loginAction } from '../../lib/auth-actions';

// Never hardcode the seed password — it must come from the build-time env var
// so that production builds (which don't set NEXT_PUBLIC_SEED_PASSWORD) cannot
// accidentally embed it in the JS bundle even if the seed panel is shown.
const SEED_PASSWORD = process.env.NEXT_PUBLIC_SEED_PASSWORD ?? '';
const ADMIN_SEED_USERS = [
  { email: 'moderator@deltasignal.org', label: 'Moderator' },
  { email: 'admin@deltasignal.org', label: 'Admin' },
];

export default async function LoginPage(
  props: {
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const showSeedLogin = process.env.NEXT_PUBLIC_ENABLE_SEED_LOGIN === 'true';

  return (
    <main className="login-page">
      <div className="login-card">
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Delta Signal" width={36} height={36} style={{ borderRadius: '8px', marginBottom: '12px' }} />
          <p className="brand">Delta Signal</p>
          <h1>Admin Console</h1>
          <p className="subtitle">Sign in with a Moderator or Admin account to continue.</p>
        </header>

        {searchParams.error && (
          <p className="form-error">{searchParams.error}</p>
        )}

        <form action={loginAction} className="form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>

        {showSeedLogin && (
          <section className="seed-login">
            <p className="seed-login-title">Seed accounts</p>
            <div className="seed-login-grid">
              {ADMIN_SEED_USERS.map((user) => (
                <form key={user.email} action={loginAction}>
                  <input type="hidden" name="email" value={user.email} />
                  <input type="hidden" name="password" value={SEED_PASSWORD} />
                  <button className="seed-login-button" type="submit">
                    <span>{user.label}</span>
                    <small>{user.email}</small>
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

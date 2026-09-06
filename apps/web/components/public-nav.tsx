import Link from 'next/link';
const NAV_LINKS = [
  { href: '/#dashboard', label: 'Overview' },
  { href: '/map', label: 'Map' },
  { href: '/#civic', label: 'Reports & Alerts' },
  { href: '/#data', label: 'Data' },
] as const;

export default async function PublicNav() {
  return (
    <header className="public-nav">
      <Link className="public-brand" href="/">
        <span className="brand-mark">NG</span>
        <span>Delta Signal</span>
      </Link>

      <nav aria-label="Public sections">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        <Link className="button ghost" href="/login">
          Sign in
        </Link>
        <Link className="button" href="/register">
          Register
        </Link>
      </div>
    </header>
  );
}

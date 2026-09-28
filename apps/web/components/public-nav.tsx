import Link from 'next/link';
import ThemeToggle from './theme-toggle';
import { getTheme } from '../lib/theme';

const NAV_LINKS = [
  { href: '/#dashboard', label: 'Overview' },
  { href: '/map', label: 'Map' },
  { href: '/#civic', label: 'Reports & Alerts' },
  { href: '/#data', label: 'Data' },
] as const;

export default async function PublicNav() {
  const theme = await getTheme();
  return (
    <header className="public-nav">
      <Link className="public-brand" href="/">
        <img src="/logo.svg" className="brand-mark" alt="Delta Signal" width={36} height={36} />
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
        <ThemeToggle theme={theme} />
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

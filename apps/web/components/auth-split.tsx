import Link from 'next/link';
import { getTheme } from '../lib/theme';
import ThemeToggle from './theme-toggle';

const DEFAULT_BENEFITS = [
  { title: 'Submit citizen reports', text: 'Flag pollution or flooding in your district. Reports are reviewed before publishing.' },
  { title: 'Download public datasets', text: 'Weather, river, emissions and biodiversity data with sources and licences.' },
  { title: 'Follow places you care about', text: 'Save districts and get notified when conditions change.' },
];

function CheckIcon() {
  return (
    <svg className="auth-benefit-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

interface AuthSplitProps {
  children: React.ReactNode;
  heading?: string;
  lede?: string;
  benefits?: readonly { title: string; text: string }[];
}

/**
 * Authentication layout (docs/design/DESIGN.md §3.3): brand panel (5 cols) + form panel (7 cols)
 * on desktop; compact header and the form only on mobile.
 */
export default async function AuthSplit({
  children,
  heading = 'Environmental data for Bangladesh, place by place.',
  lede = 'Browsing is open to everyone. An account lets you contribute and download.',
  benefits = DEFAULT_BENEFITS,
}: AuthSplitProps) {
  const theme = await getTheme();

  return (
    <div className="auth-split">
      <aside className="auth-brand-panel">
        <Link className="auth-brand-link" href="/">
          <img src="/logo.svg" alt="" width={32} height={32} />
          <span>Delta Signal</span>
        </Link>

        <div className="auth-brand-body">
          <div className="auth-brand-intro">
            <h2>{heading}</h2>
            <p>{lede}</p>
          </div>
          <ul className="auth-benefits">
            {benefits.map((b) => (
              <li key={b.title}>
                <CheckIcon />
                <div>
                  <strong>{b.title}</strong>
                  <p>{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-brand-foot">
          Independent public platform — not a government service. Data from Open-Meteo, GloFAS and GBIF.
        </p>
      </aside>

      <div className="auth-main">
        <header className="auth-topbar">
          <Link className="auth-back" href="/">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back to Delta Signal
          </Link>
          <Link className="auth-topbar-brand" href="/">
            <img src="/logo.svg" alt="" width={26} height={26} />
            <span>Delta Signal</span>
          </Link>
          <ThemeToggle theme={theme} compact />
        </header>

        <main className="auth-content">
          <div className="auth-form-col">{children}</div>
        </main>

        <footer className="auth-footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Help</Link>
        </footer>
      </div>
    </div>
  );
}

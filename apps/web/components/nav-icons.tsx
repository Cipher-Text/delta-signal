import type { ReactNode } from 'react';

// One icon family: 20px grid, 1.6 stroke, round caps (§17). Decorative — the link text is the label.
const PATHS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" /></>,
  observations: <path d="M2 10h4l2-5 4 10 2-5h4" />,
  alerts: <><path d="M10 3l8 14H2z" /><path d="M10 8v4M10 14.5v.5" /></>,
  biodiversity: <path d="M4 16c0-7 5-12 13-12 0 8-5 13-12 13M4 16l6-6" />,
  'water-bodies': <path d="M10 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z" />,
  marine: <path d="M2 8c2-2 3-2 5 0s3 2 5 0 3-2 5 0M2 13c2-2 3-2 5 0s3 2 5 0 3-2 5 0" />,
  radiation: <><circle cx="10" cy="10" r="3.2" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4" /></>,
  emissions: <path d="M6 15a3.5 3.5 0 0 1 0-7 4.5 4.5 0 0 1 8.5-1A3.5 3.5 0 0 1 14 15z" />,
  'industrial-sites': <path d="M3 17V9l5 3V9l5 3V5h4v12z" />,
  data: <><ellipse cx="10" cy="5" rx="6" ry="2.5" /><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></>,
  locations: <><path d="M10 18s6-5.2 6-10a6 6 0 0 0-12 0c0 4.8 6 10 6 10z" /><circle cx="10" cy="8" r="2" /></>,
  reports: <path d="M5 17V3M5 4h9l-2 3 2 3H5" />,
  restoration: <path d="M10 17V9M10 9c0-3-2-4.5-5-4.5 0 3 1.5 4.5 5 4.5M10 11c0-3 2-4.5 5-4.5 0 3-1.5 4.5-5 4.5" />,
  community: <path d="M3 4h14v9H8l-4 3v-3H3z" />,
  organizations: <path d="M4 17V4h8v13M12 8h4v9M7 7h2M7 10h2M7 13h2M3 17h14" />,
  members: <><circle cx="8" cy="7" r="3" /><path d="M2 17c0-3 2.5-5 6-5s6 2 6 5" /><circle cx="15" cy="8" r="2" /></>,
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
  help: <><circle cx="10" cy="10" r="7.5" /><path d="M7.9 8a2.2 2.2 0 1 1 3.2 2c-.7.4-1.1.9-1.1 1.7M10 14.3v.2" /></>,
  collapse: <><rect x="3" y="3.5" width="14" height="13" rx="2" /><path d="M8 3.5v13" /></>,
  chevron: <path d="M5 8l5 5 5-5" />,
  'chevron-left': <path d="M12 5l-5 5 5 5" />,
  'chevron-right': <path d="M8 5l5 5-5 5" />,
  clock: <><circle cx="10" cy="10" r="7.5" /><path d="M10 5.8V10l2.5 1.7" /></>,
  calendar: <><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 2.5v3M13 2.5v3" /></>,
  search: <><circle cx="9.2" cy="9.2" r="5.8" /><path d="M17 17l-3.7-3.7" /></>,
  bell: <><path d="M5 7a5 5 0 0 1 10 0c0 5.8 2.5 6.7 2.5 6.7h-15S5 12.8 5 7" /><path d="M8.3 16.7a1.8 1.8 0 0 0 3.4 0" /></>,
  moon: <path d="M16.7 12.2A6.7 6.7 0 0 1 7.8 3.3a6.7 6.7 0 1 0 8.9 8.9z" />,
  sun: <><circle cx="10" cy="10" r="3.3" /><path d="M10 2v1.7M10 16.3V18M2 10h1.7M16.3 10H18M4.3 4.3l1.2 1.2M14.5 14.5l1.2 1.2M15.7 4.3l-1.2 1.2M5.5 14.5l-1.2 1.2" /></>,
  close: <path d="M5 5l10 10M15 5L5 15" />,
};

export default function NavIcon({ name }: { name: string }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.dashboard}
    </svg>
  );
}

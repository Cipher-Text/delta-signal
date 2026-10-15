/** Organization logo, or its first letter on a tinted tile when none is uploaded. */
export default function OrgLogo({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'md' | 'lg' }) {
  const cls = `org-logo org-logo--${size}`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={url} alt={`${name} logo`} loading="lazy" />;
  }
  return <span className={`${cls} org-logo--empty`} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>;
}

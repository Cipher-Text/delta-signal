/** Slugs that would collide with fixed routes (`/organizations/mine`, `/organizations/count`, `/organizations/new`, …). */
export const RESERVED_SLUGS = ['mine', 'count', 'new', 'edit', 'admin', 'create', 'api'] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 80;

/** "Center for Natural Resource Studies (CNRS)" → "center-for-natural-resource-studies-cnrs". Accents are folded; empty results fall back to "organization". */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
  const base = slug.length >= SLUG_MIN ? slug : slug ? `${slug}-org` : 'organization';
  return (RESERVED_SLUGS as readonly string[]).includes(base) ? `${base}-org` : base;
}

export function isValidSlug(value: string): boolean {
  return value.length >= SLUG_MIN && value.length <= SLUG_MAX && SLUG_PATTERN.test(value) && !(RESERVED_SLUGS as readonly string[]).includes(value);
}

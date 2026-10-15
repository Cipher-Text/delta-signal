/** Platforms an organization can link to; keys match the API's allowlist. */
export const ORG_LINK_PLATFORMS = ['facebook', 'linkedin', 'x', 'youtube', 'instagram', 'github', 'publications'] as const;

export const ORG_LINK_LABELS: Record<(typeof ORG_LINK_PLATFORMS)[number], string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  instagram: 'Instagram',
  github: 'GitHub',
  publications: 'Publications / reports',
};

/** Display labels for organization link platforms (keys match the API's allowlist). */
export const ORG_LINK_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  youtube: 'YouTube',
  instagram: 'Instagram',
  github: 'GitHub',
  publications: 'Publications',
};

export const ORG_LINK_ORDER = ['facebook', 'linkedin', 'x', 'youtube', 'instagram', 'github', 'publications'];

/** Mirrors the API rule: platform admins, or members holding the organization-level ADMIN role. */
export function canEditOrganization(user: { role: string; organizations: Array<{ id: string; membershipRole: string }> } | null, organizationId: string): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.organizations.some((o) => o.id === organizationId && o.membershipRole === 'ADMIN');
}

import type { OrganizationType } from '@delta-signal/contracts';

export const ORG_TYPE_META: Record<OrganizationType, { label: string; short: string; plural: string; tint: string }> = {
  NGO: { label: 'NGO', short: 'NGO', plural: 'NGOs', tint: 'bio' },
  GOVERNMENT_AGENCY: { label: 'Government agency', short: 'Government', plural: 'government agencies', tint: 'water' },
  RESEARCH_INSTITUTION: { label: 'Research institution', short: 'Research', plural: 'research institutions', tint: 'sky' },
  INTERNATIONAL_ORG: { label: 'International org', short: 'International', plural: 'international organizations', tint: 'earth' },
  COMMUNITY_GROUP: { label: 'Community group', short: 'Community', plural: 'community groups', tint: 'neutral' },
  PRIVATE_COMPANY: { label: 'Corporate', short: 'Corporate', plural: 'companies', tint: 'neutral' },
  OTHER: { label: 'Other', short: 'Other', plural: 'other organizations', tint: 'neutral' },
};

export const ORG_TYPE_ORDER = Object.keys(ORG_TYPE_META) as OrganizationType[];

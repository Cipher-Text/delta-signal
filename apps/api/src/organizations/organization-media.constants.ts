/** Platforms an organization can link to (one URL each). The website lives on `Organization.website`. */
export const ORG_LINK_PLATFORMS = ['facebook', 'linkedin', 'x', 'youtube', 'instagram', 'github', 'publications'] as const;
export type OrgLinkPlatform = (typeof ORG_LINK_PLATFORMS)[number];

export const ORG_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ORG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ORG_MAX_PHOTOS = 8;
export const ORG_LOGO_MAX_PX = 512;
export const ORG_PHOTO_MAX_PX = 1600;

/** Returns the trimmed URL when it is an absolute http(s) address, otherwise null. */
export function cleanHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

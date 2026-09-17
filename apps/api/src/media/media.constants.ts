/** Maximum file size accepted by the upload endpoint (100 MB). */
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

/** Profile pictures are deliberately smaller and image-only. */
export const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const PROFILE_PICTURE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * MIME types accepted for upload.
 * Shared by MediaService validation and AddMediaDto's @IsIn guard.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Folders that callers may request. Each maps to a path prefix in the bucket
 * so that objects can be scoped by purpose in lifecycle rules or IAM policies.
 */
export const UPLOAD_FOLDERS = ['reports', 'observations', 'profile', 'general'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

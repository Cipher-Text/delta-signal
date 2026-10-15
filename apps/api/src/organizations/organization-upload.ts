import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ORG_IMAGE_MAX_BYTES } from './organization-media.constants';

/** Multipart `file` field held in memory (validated and re-encoded by the service). */
export const orgImageUpload = () => FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: ORG_IMAGE_MAX_BYTES } });

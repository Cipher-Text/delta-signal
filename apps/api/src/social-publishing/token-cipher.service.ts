import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

/**
 * Encrypts/decrypts long-lived platform access tokens at rest using
 * SOCIAL_TOKEN_ENCRYPTION_KEY (base64, 32 bytes — validated at boot in
 * env.validation.ts). Ciphertext layout: base64(iv || authTag || ciphertext).
 */
@Injectable()
export class TokenCipherService {
  private readonly logger = new Logger(TokenCipherService.name);
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const raw = config.get<string>('SOCIAL_TOKEN_ENCRYPTION_KEY');
    if (!raw) {
      this.key = null;
      this.logger.warn(
        'SOCIAL_TOKEN_ENCRYPTION_KEY not set — social platform connections disabled. ' +
        'Generate one with `openssl rand -base64 32` to enable.',
      );
      return;
    }
    this.key = Buffer.from(raw, 'base64');
  }

  get isConfigured(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    this.assertConfigured();
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key!, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(payload: string): string {
    this.assertConfigured();
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH_BYTES);
    const authTag = buffer.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
    const ciphertext = buffer.subarray(IV_LENGTH_BYTES + 16);
    const decipher = createDecipheriv(ALGORITHM, this.key!, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  private assertConfigured(): void {
    if (!this.key) {
      throw new ServiceUnavailableException(
        'Social token encryption is not configured. Set SOCIAL_TOKEN_ENCRYPTION_KEY.',
      );
    }
  }
}

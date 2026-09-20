import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { TokenCipherService } from './token-cipher.service';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64'); // 32-byte AES-256 key

function mockConfig(key: string | undefined) {
  return { get: jest.fn().mockReturnValue(key) } as unknown as ConfigService;
}

describe('TokenCipherService', () => {
  it('is unconfigured when SOCIAL_TOKEN_ENCRYPTION_KEY is absent', () => {
    const service = new TokenCipherService(mockConfig(undefined));
    expect(service.isConfigured).toBe(false);
  });

  it('throws ServiceUnavailableException from encrypt() when unconfigured', () => {
    const service = new TokenCipherService(mockConfig(undefined));
    expect(() => service.encrypt('secret')).toThrow(ServiceUnavailableException);
  });

  it('round-trips plaintext through encrypt/decrypt', () => {
    const service = new TokenCipherService(mockConfig(TEST_KEY));
    const ciphertext = service.encrypt('a-long-lived-page-access-token');
    expect(service.decrypt(ciphertext)).toBe('a-long-lived-page-access-token');
  });

  it('produces different ciphertext for the same plaintext on each call (random IV)', () => {
    const service = new TokenCipherService(mockConfig(TEST_KEY));
    const first = service.encrypt('same-token');
    const second = service.encrypt('same-token');
    expect(first).not.toBe(second);
  });

  it('rejects decryption with a different key (auth tag mismatch)', () => {
    const encryptingService = new TokenCipherService(mockConfig(TEST_KEY));
    const otherKey = Buffer.alloc(32, 9).toString('base64');
    const decryptingService = new TokenCipherService(mockConfig(otherKey));
    const ciphertext = encryptingService.encrypt('secret-token');
    expect(() => decryptingService.decrypt(ciphertext)).toThrow();
  });

  it('rejects tampered ciphertext', () => {
    const service = new TokenCipherService(mockConfig(TEST_KEY));
    const ciphertext = service.encrypt('secret-token');
    const buffer = Buffer.from(ciphertext, 'base64');
    buffer[buffer.length - 1] ^= 0xff; // flip a byte in the ciphertext
    expect(() => service.decrypt(buffer.toString('base64'))).toThrow();
  });
});

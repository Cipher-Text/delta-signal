import { validateEnv } from './env.validation';

const DB = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };
const VALID = { ...DB, JWT_SECRET: 'a'.repeat(48) };

describe('validateEnv', () => {
  it('accepts a sufficiently long secret', () => {
    expect(validateEnv(VALID)).toBe(VALID);
  });

  describe('rejects an unusable JWT_SECRET', () => {
    it.each([
      ['absent', undefined],
      ['empty', ''],
      ['whitespace only', '    '],
      ['non-string', 12345],
    ])('%s', (_label, value) => {
      expect(() => validateEnv({ ...DB, JWT_SECRET: value })).toThrow(/JWT_SECRET is not set/);
    });

    // Regression: this exact literal was the hardcoded fallback in
    // auth.module.ts and jwt.strategy.ts. See docs/progress.md
    // "JWT Secret Fail-Fast".
    it.each(['dev-secret-change-in-production', 'change-me', 'changeme', 'secret'])(
      'known placeholder %s',
      (placeholder) => {
        expect(() => validateEnv({ ...DB, JWT_SECRET: placeholder })).toThrow(
          /known placeholder value/,
        );
      },
    );

    it('is case-insensitive about placeholders', () => {
      expect(() => validateEnv({ ...DB, JWT_SECRET: 'DEV-Secret-Change-In-Production' })).toThrow(
        /known placeholder value/,
      );
    });
  });

  describe('minimum length', () => {
    it('rejects 31 characters', () => {
      expect(() => validateEnv({ ...DB, JWT_SECRET: 'a'.repeat(31) })).toThrow(
        /is 31 characters; at least 32 are required/,
      );
    });

    it('accepts exactly 32', () => {
      expect(() => validateEnv({ ...DB, JWT_SECRET: 'a'.repeat(32) })).not.toThrow();
    });
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: 'a'.repeat(48) })).toThrow(/DATABASE_URL is not set/);
  });

  it('reports every problem at once rather than the first', () => {
    try {
      validateEnv({});
      fail('expected validateEnv to throw');
    } catch (err) {
      expect((err as Error).message).toMatch(/JWT_SECRET is not set/);
      expect((err as Error).message).toMatch(/DATABASE_URL is not set/);
    }
  });

  it('points at the fix', () => {
    expect(() => validateEnv({ ...DB })).toThrow(/openssl rand -base64 48/);
  });

  describe('NODE_ENV', () => {
    it('accepts valid values', () => {
      expect(() => validateEnv({ ...VALID, NODE_ENV: 'development' })).not.toThrow();
      expect(() => validateEnv({ ...VALID, NODE_ENV: 'test' })).not.toThrow();
      // production also requires CORS_ORIGIN and APP_URL
      expect(() =>
        validateEnv({
          ...VALID,
          NODE_ENV: 'production',
          CORS_ORIGIN: 'https://deltasignal.org',
          APP_URL: 'https://deltasignal.org',
        }),
      ).not.toThrow();
    });

    it('rejects an unrecognised value', () => {
      expect(() => validateEnv({ ...VALID, NODE_ENV: 'staging' })).toThrow(
        /NODE_ENV "staging" is not valid/,
      );
    });

    it('allows NODE_ENV to be absent (defaults gracefully)', () => {
      expect(() => validateEnv(VALID)).not.toThrow();
    });
  });

  describe('CORS_ORIGIN in production', () => {
    it('requires CORS_ORIGIN when NODE_ENV is production', () => {
      expect(() =>
        validateEnv({ ...VALID, NODE_ENV: 'production', APP_URL: 'https://deltasignal.org' }),
      ).toThrow(/CORS_ORIGIN is not set/);
    });

    it('accepts production config when CORS_ORIGIN and APP_URL are set', () => {
      expect(() =>
        validateEnv({
          ...VALID,
          NODE_ENV: 'production',
          CORS_ORIGIN: 'https://deltasignal.org',
          APP_URL: 'https://deltasignal.org',
        }),
      ).not.toThrow();
    });

    it('does not require CORS_ORIGIN in development', () => {
      expect(() =>
        validateEnv({ ...VALID, NODE_ENV: 'development' }),
      ).not.toThrow();
    });
  });

  describe('APP_URL', () => {
    it('rejects a container bind address', () => {
      expect(() => validateEnv({ ...VALID, APP_URL: 'https://0.0.0.0:3000' })).toThrow(
        /browser-reachable public URL/,
      );
    });

    it('requires HTTPS in production', () => {
      expect(() =>
        validateEnv({
          ...VALID,
          NODE_ENV: 'production',
          CORS_ORIGIN: 'https://deltasignal.org',
          APP_URL: 'http://deltasignal.org',
        }),
      ).toThrow(/APP_URL must use https/);
    });
  });
});

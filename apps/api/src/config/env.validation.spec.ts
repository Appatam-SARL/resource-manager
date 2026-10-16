import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AppEnv, validateEnv } from './env.validation.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://localhost:5432/test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('validateEnv', () => {
  it('defaults to the development deployment target without proxy trust', () => {
    const env = validateEnv(baseEnv);

    expect(env.APP_ENV).toBe(AppEnv.Development);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('converts TRUST_PROXY_HOPS from its string form', () => {
    const env = validateEnv({ ...baseEnv, TRUST_PROXY_HOPS: '1', APP_ENV: 'staging' });

    expect(env.TRUST_PROXY_HOPS).toBe(1);
    expect(env.APP_ENV).toBe(AppEnv.Staging);
  });

  it('rejects an unknown deployment target', () => {
    expect(() => validateEnv({ ...baseEnv, APP_ENV: 'qa' })).toThrow(/APP_ENV/);
  });

  it('rejects an out-of-range proxy hop count', () => {
    expect(() => validateEnv({ ...baseEnv, TRUST_PROXY_HOPS: '9' })).toThrow(
      /TRUST_PROXY_HOPS/,
    );
  });

  describe('SMTP', () => {
    const smtpEnv = {
      SMTP_HOST: 'mail.example.test',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'no-reply@example.test',
      SMTP_PASSWORD: 'secret',
      MAIL_FROM: 'Resource Manager <no-reply@example.test>',
    };

    it('is optional outside production', () => {
      expect(() => validateEnv({ ...baseEnv, APP_ENV: 'preprod' })).not.toThrow();
    });

    it('is required in production', () => {
      expect(() => validateEnv({ ...baseEnv, APP_ENV: 'production' })).toThrow(
        /SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM required/,
      );
    });

    it('accepts a complete production SMTP configuration', () => {
      const env = validateEnv({ ...baseEnv, ...smtpEnv, APP_ENV: 'production' });

      expect(env.SMTP_PORT).toBe(465);
      expect(env.SMTP_SECURE).toBe('true');
    });

    it('rejects a non-boolean SMTP_SECURE', () => {
      expect(() => validateEnv({ ...baseEnv, ...smtpEnv, SMTP_SECURE: 'yes' })).toThrow();
    });
  });
});

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
});

import { describe, expect, it } from 'vitest';
import {
  formatBuildLabel,
  isNonProductionEnvironment,
  readServerRuntimeConfig,
  serializeRuntimeConfig,
} from './runtime-config';

describe('readServerRuntimeConfig', () => {
  it('falls back to development defaults', () => {
    expect(readServerRuntimeConfig({})).toEqual({
      apiUrl: null,
      environment: 'development',
      version: 'dev',
      commit: 'local',
    });
  });

  it('keeps an empty API URL as same-origin and trims trailing slashes', () => {
    expect(readServerRuntimeConfig({ API_PUBLIC_URL: '' }).apiUrl).toBe('');
    expect(
      readServerRuntimeConfig({ API_PUBLIC_URL: 'https://api.staging.example/' }).apiUrl,
    ).toBe('https://api.staging.example');
  });

  it('falls back to the commit exposed by Vercel', () => {
    expect(readServerRuntimeConfig({ VERCEL_GIT_COMMIT_SHA: 'vercel123' }).commit).toBe(
      'vercel123',
    );
    expect(
      readServerRuntimeConfig({ GIT_COMMIT_SHA: 'image456', VERCEL_GIT_COMMIT_SHA: 'vercel123' })
        .commit,
    ).toBe('image456');
  });

  it('ignores unknown environments', () => {
    expect(readServerRuntimeConfig({ APP_ENV: 'qa' }).environment).toBe('development');
    expect(readServerRuntimeConfig({ APP_ENV: 'preprod' }).environment).toBe('preprod');
  });

  it('never exposes unrelated server variables', () => {
    const config = readServerRuntimeConfig({
      APP_ENV: 'staging',
      DATABASE_URL: 'postgresql://secret',
      JWT_ACCESS_SECRET: 'secret',
    });
    expect(JSON.stringify(config)).not.toContain('secret');
  });
});

describe('serializeRuntimeConfig', () => {
  it('escapes characters that could close the script tag', () => {
    const script = serializeRuntimeConfig({
      apiUrl: '</script><script>alert(1)</script>',
      environment: 'staging',
      version: '1.0.0',
      commit: 'abc',
    });
    expect(script).not.toContain('</script>');
    expect(script.startsWith('window.__RM_RUNTIME_CONFIG__=')).toBe(true);
  });
});

describe('deployment labels', () => {
  it('flags staging and preprod only', () => {
    expect(isNonProductionEnvironment('staging')).toBe(true);
    expect(isNonProductionEnvironment('preprod')).toBe(true);
    expect(isNonProductionEnvironment('production')).toBe(false);
    expect(isNonProductionEnvironment('development')).toBe(false);
  });

  it('formats version and short commit', () => {
    expect(formatBuildLabel({ version: '1.4.2', commit: 'abc1234def5678' })).toBe(
      'v1.4.2 · abc1234',
    );
  });
});

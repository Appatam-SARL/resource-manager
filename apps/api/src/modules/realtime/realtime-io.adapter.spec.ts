import { describe, expect, it } from 'vitest';
import { resolveRealtimeCorsOrigin } from './realtime-io.adapter.js';

describe('resolveRealtimeCorsOrigin', () => {
  it('uses the explicit origin list', () => {
    expect(
      resolveRealtimeCorsOrigin('http://localhost:3001, https://admin.example.com', 'production'),
    ).toEqual(['http://localhost:3001', 'https://admin.example.com']);
  });

  it('never allows "*" in production', () => {
    expect(resolveRealtimeCorsOrigin('*', 'production')).toBe(false);
    expect(resolveRealtimeCorsOrigin(undefined, 'production')).toBe(false);
  });

  it('keeps development convenient when nothing is configured', () => {
    expect(resolveRealtimeCorsOrigin('*', 'development')).toBe(true);
    expect(resolveRealtimeCorsOrigin(undefined, 'test')).toBe(true);
  });

  it('ignores "*" mixed with explicit origins', () => {
    expect(resolveRealtimeCorsOrigin('*,http://localhost:3001', 'production')).toEqual([
      'http://localhost:3001',
    ]);
  });
});

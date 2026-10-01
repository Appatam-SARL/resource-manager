import { ApiError } from '@resource-manager/api-client';
import { describe, expect, it } from 'vitest';
import { isRefreshTokenRejected } from './api';

describe('isRefreshTokenRejected', () => {
  it('treats 400, 401 and 403 as a rejected refresh token', () => {
    for (const status of [400, 401, 403]) {
      expect(isRefreshTokenRejected(new ApiError(status, '', undefined))).toBe(true);
    }
  });

  it('keeps the session on server errors and network failures', () => {
    expect(isRefreshTokenRejected(new ApiError(500, '', undefined))).toBe(false);
    expect(isRefreshTokenRejected(new ApiError(503, '', undefined))).toBe(false);
    expect(isRefreshTokenRejected(new TypeError('Failed to fetch'))).toBe(false);
  });
});

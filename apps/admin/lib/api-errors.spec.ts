import { describe, expect, it } from 'vitest';
import { ApiError } from '@resource-manager/api-client';
import { isNotFoundOrForbidden } from './api-errors';

describe('isNotFoundOrForbidden', () => {
  it('matches 404 and 403 API errors', () => {
    expect(isNotFoundOrForbidden(new ApiError(404, ''))).toBe(true);
    expect(isNotFoundOrForbidden(new ApiError(403, ''))).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isNotFoundOrForbidden(new ApiError(500, ''))).toBe(false);
    expect(isNotFoundOrForbidden(new Error('network'))).toBe(false);
    expect(isNotFoundOrForbidden(undefined)).toBe(false);
  });
});

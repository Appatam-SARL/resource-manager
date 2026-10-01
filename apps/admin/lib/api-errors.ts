import { ApiError } from '@resource-manager/api-client';

/** 404 or 403: the entity does not exist or is outside the user's organisational scope. */
export function isNotFoundOrForbidden(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

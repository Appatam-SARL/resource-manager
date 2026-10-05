import { ApiError, createApiClient, type ApiClient } from '@resource-manager/api-client';
import type { AuthTokens, AuthUser } from '@resource-manager/types';
import { getBrowserRuntimeConfig } from '@/lib/runtime-config';

const ACCESS_KEY = 'rm_admin_access_token';
const REFRESH_KEY = 'rm_admin_refresh_token';
const USER_KEY = 'rm_admin_user';

/**
 * Resolution order: runtime API_PUBLIC_URL (injected by the server) → build-time
 * NEXT_PUBLIC_API_URL → local API. An empty value means same-origin (reverse proxy on /api).
 */
export function getApiBaseUrl(): string {
  const runtimeApiUrl = getBrowserRuntimeConfig()?.apiUrl;
  if (runtimeApiUrl != null) return runtimeApiUrl;
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured === undefined) return 'http://localhost:3000';
  return configured.trim().replace(/\/$/, '');
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
  document.cookie = `rm_admin_authenticated=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie =
    'rm_admin_authenticated=; path=/; max-age=0; SameSite=Lax';
}

export function isRefreshTokenRejected(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  );
}

let refreshPromise: Promise<AuthTokens | null> | null = null;

export async function refreshSession(): Promise<AuthTokens | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      const tokens = await client.refresh({ refreshToken });
      persistSession(tokens);
      return tokens;
    } catch (error) {
      // A network error or a 5xx during a deploy must not log the user out.
      if (isRefreshTokenRejected(error)) clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function createBrowserApiClient(
  onUnauthorized?: () => void,
): ApiClient {
  return createApiClient({
    baseUrl: getApiBaseUrl(),
    getAccessToken: getStoredAccessToken,
    onUnauthorized,
  });
}

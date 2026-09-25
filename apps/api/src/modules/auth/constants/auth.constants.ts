export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Identifiants invalides.',
  ACCOUNT_INACTIVE: 'Identifiants invalides.',
  INVALID_REFRESH_TOKEN: 'Refresh token invalide ou expiré.',
  UNAUTHORIZED: 'Authentification requise.',
  FORBIDDEN: 'Accès refusé.',
} as const;

export const AUTH_THROTTLE = {
  LOGIN_TTL_MS: 60_000,
  LOGIN_LIMIT: 5,
} as const;

/** Used to derive a stable hash of opaque refresh tokens before persistence. */
export const REFRESH_TOKEN_HASH_ALGORITHM = 'sha256' as const;

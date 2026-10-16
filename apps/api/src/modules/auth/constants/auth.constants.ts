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
  FORGOT_PASSWORD_TTL_MS: 60_000,
  FORGOT_PASSWORD_LIMIT: 5,
  RESET_PASSWORD_TTL_MS: 60_000,
  RESET_PASSWORD_LIMIT: 10,
} as const;

export const PASSWORD_RESET = {
  CODE_VALIDITY_MINUTES: 15,
  MAX_ATTEMPTS: 5,
  /** Per e-mail address, on top of the per-IP route throttling. */
  MIN_INTERVAL_MS: 60_000,
  MAX_REQUESTS_PER_HOUR: 5,
  ACCEPTED_MESSAGE:
    'Si un compte actif correspond à cet email, un code de vérification vient d’être envoyé.',
  INVALID_CODE_MESSAGE: 'Code invalide ou expiré.',
  SUCCESS_MESSAGE:
    'Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.',
} as const;

/** Used to derive a stable hash of opaque refresh tokens before persistence. */
export const REFRESH_TOKEN_HASH_ALGORITHM = 'sha256' as const;

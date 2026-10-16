import { AppError, mapApiError } from '@/lib/errors';

export const RESEND_COOLDOWN_SECONDS = 60;

export const PASSWORD_RESET_SENT_MESSAGE =
  'Si un compte actif correspond à cet email, un code de vérification vient d’être envoyé.';

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.';

export function getPasswordResetErrorMessage(error: unknown): string {
  const appError = error instanceof AppError ? error : mapApiError(error);
  if (appError.status === 429) {
    return 'Trop de tentatives, réessayez dans quelques minutes.';
  }
  if (appError.status === 400) {
    return appError.message || 'Code invalide ou expiré.';
  }
  return appError.message;
}

/** "Renvoyer le code (45 s)" while the cooldown runs, "Renvoyer le code" afterwards. */
export function formatResendLabel(secondsLeft: number): string {
  return secondsLeft > 0 ? `Renvoyer le code (${secondsLeft} s)` : 'Renvoyer le code';
}

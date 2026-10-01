import { AppError } from '@/lib/errors';

export type ReservationSubmitError = {
  kind: 'conflict' | 'general';
  message: string;
};

export const CONFLICT_MESSAGE =
  'Cette ressource vient d’être réservée pour cette période. Choisissez une autre ressource ou modifiez l’horaire.';

/** Maps an API failure on POST /reservations to a user-facing message. */
export function getReservationSubmitError(error: unknown): ReservationSubmitError {
  if (!(error instanceof AppError)) {
    return { kind: 'general', message: 'Impossible d’envoyer la demande. Veuillez réessayer.' };
  }
  switch (error.status) {
    case 409:
      return { kind: 'conflict', message: CONFLICT_MESSAGE };
    case 401:
      return { kind: 'general', message: 'Votre session a expiré. Veuillez vous reconnecter.' };
    case 403:
      return {
        kind: 'general',
        message: 'Vous n’êtes pas autorisé à réserver cette ressource.',
      };
    case 404:
      return {
        kind: 'general',
        message: 'Cette ressource n’existe plus. Choisissez-en une autre.',
      };
    default:
      return { kind: 'general', message: error.message };
  }
}

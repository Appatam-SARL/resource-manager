export class AppError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function mapApiError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const axiosError = error as {
      response?: { status?: number; data?: { message?: string | string[] } };
      message?: string;
      code?: string;
    };
    const status = axiosError.response?.status;
    const raw = axiosError.response?.data?.message;
    const serverMessage = Array.isArray(raw) ? raw.join(', ') : raw;

    switch (status) {
      case 400:
        return new AppError(
          serverMessage || 'Requête invalide. Vérifiez les informations saisies.',
          400,
        );
      case 401:
        return new AppError('Email ou mot de passe incorrect.', 401);
      case 403:
        return new AppError(
          "Vous n'avez pas l'autorisation d'effectuer cette action.",
          403,
        );
      case 404:
        return new AppError('Ressource introuvable.', 404);
      case 409:
        return new AppError(
          'Cette ressource vient d’être réservée. Veuillez choisir une autre période.',
          409,
        );
      case 422:
        return new AppError(
          serverMessage || 'Les données fournies sont invalides.',
          422,
        );
      case 429:
        return new AppError(
          'Trop de tentatives. Veuillez réessayer dans un moment.',
          429,
        );
      case 503:
        return new AppError(
          'Service temporairement indisponible. Réessayez plus tard.',
          503,
        );
      case 500:
      default:
        if (axiosError.code === 'ECONNABORTED') {
          return new AppError(
            'La connexion a expiré. Vérifiez votre réseau et réessayez.',
          );
        }
        if (axiosError.message?.includes('Network')) {
          return new AppError(
            'Impossible de joindre le serveur. Vérifiez votre connexion.',
          );
        }
        return new AppError(
          'Une erreur est survenue. Veuillez réessayer.',
          status,
        );
    }
  }

  if (error instanceof Error && error.message) {
    return new AppError('Une erreur est survenue. Veuillez réessayer.');
  }

  return new AppError('Une erreur est survenue. Veuillez réessayer.');
}

import type { AuthUser } from '@resource-manager/types';
import type { PushPermissionStatus } from '@/types/notification';

type ActivityHeading = { title: string; subtitle?: string };

/** Mirrors the backend reservation scope used by GET /dashboard/summary. */
export function getActivityHeading(
  user: Pick<AuthUser, 'role' | 'company' | 'direction'>,
): ActivityHeading {
  switch (user.role) {
    case 'EMPLOYEE':
      return { title: 'Mon activité' };
    case 'MANAGER':
      return {
        title: 'Activité de mon périmètre',
        subtitle: user.direction?.name ?? user.company.name,
      };
    case 'COMPANY_ADMIN':
      return { title: 'Activité de mon entreprise', subtitle: user.company.name };
    case 'GROUP_ADMIN':
      return { title: 'Activité du groupe', subtitle: 'Toutes les entreprises' };
  }
}

export function describePushPermission(status: PushPermissionStatus | undefined): string {
  switch (status) {
    case 'granted':
    case 'provisional':
      return 'Activées sur cet appareil';
    case 'denied':
      return 'Désactivées — ouvrir les réglages';
    case 'undetermined':
      return 'Non configurées sur cet appareil';
    case 'unavailable':
      return 'Consultez vos notifications';
    default:
      return 'Vérification en cours…';
  }
}

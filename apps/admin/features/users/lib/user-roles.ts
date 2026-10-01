import type { Role } from '@resource-manager/types';

export const ROLE_ORDER: Role[] = ['GROUP_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  GROUP_ADMIN: 'Administre toutes les entreprises du Groupe.',
  COMPANY_ADMIN: 'Administre les utilisateurs, directions et ressources de son entreprise.',
  MANAGER: 'Valide les demandes de sa direction, ou de toute l’entreprise s’il n’a pas de direction.',
  EMPLOYEE: 'Réserve les ressources de son entreprise et suit ses demandes.',
};

/**
 * Roles the current user may assign — mirrors the API rule (a Company admin cannot
 * create a Group admin). The API remains the authority.
 */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === 'GROUP_ADMIN') return ROLE_ORDER;
  if (actorRole === 'COMPANY_ADMIN') return ROLE_ORDER.filter((role) => role !== 'GROUP_ADMIN');
  return [];
}

/**
 * Whether the current user may edit a given account — mirrors the API rule
 * (only a Group admin manages a Group admin account). The API remains the authority.
 */
export function canManageAccount(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'GROUP_ADMIN') return true;
  if (actorRole === 'COMPANY_ADMIN') return targetRole !== 'GROUP_ADMIN';
  return false;
}

/** Hint shown under the direction field, depending on the role and the presence of a direction. */
export function directionScopeHint(role: Role, hasDirection: boolean): string | undefined {
  if (role !== 'MANAGER') return undefined;
  return hasDirection
    ? 'Le responsable valide les demandes de cette direction.'
    : 'Sans direction, le responsable valide les demandes de toute l’entreprise.';
}

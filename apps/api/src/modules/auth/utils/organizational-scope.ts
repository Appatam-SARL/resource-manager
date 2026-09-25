/**
 * Lightweight helpers for future domain modules to reason about
 * Group → Company → Direction (optional) → User scope.
 * Role checks alone are not sufficient for authorization.
 */
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

export function getUserCompanyId(user: AuthenticatedUser): string {
  return user.companyId;
}

export function getUserDirectionId(user: AuthenticatedUser): string | null {
  return user.directionId;
}

export function getUserRole(user: AuthenticatedUser): Role {
  return user.role;
}

export function belongsToCompany(
  user: AuthenticatedUser,
  companyId: string,
): boolean {
  if (user.role === Role.GROUP_ADMIN) {
    return true;
  }
  return user.companyId === companyId;
}

export function belongsToDirection(
  user: AuthenticatedUser,
  directionId: string,
): boolean {
  if (user.role === Role.GROUP_ADMIN) {
    return true;
  }
  if (user.role === Role.COMPANY_ADMIN) {
    return true;
  }
  if (user.directionId == null) {
    // User scoped at company level (no direction) — direction checks
    // must be decided by the calling domain with explicit business rules.
    return false;
  }
  return user.directionId === directionId;
}

export function hasAnyRole(user: AuthenticatedUser, roles: Role[]): boolean {
  return roles.includes(user.role);
}

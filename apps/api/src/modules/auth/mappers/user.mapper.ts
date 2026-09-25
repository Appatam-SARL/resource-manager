import { Role, User, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

type UserWithOrg = User & {
  company: { id: string; name: string };
  direction: { id: string; name: string } | null;
};

export function toAuthenticatedUser(user: UserWithOrg): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    directionId: user.directionId,
    company: {
      id: user.company.id,
      name: user.company.name,
    },
    direction: user.direction
      ? {
          id: user.direction.id,
          name: user.direction.name,
        }
      : null,
  };
}

export function assertNoSensitiveFields(payload: unknown): void {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const record = payload as Record<string, unknown>;
  if ('passwordHash' in record) {
    throw new Error('passwordHash must never be exposed in API responses');
  }
  if ('tokenHash' in record) {
    throw new Error('tokenHash must never be exposed in API responses');
  }
}

export const ALL_ROLES: Role[] = [
  Role.GROUP_ADMIN,
  Role.COMPANY_ADMIN,
  Role.MANAGER,
  Role.EMPLOYEE,
];

export function isActiveUser(status: UserStatus): boolean {
  return status === UserStatus.ACTIVE;
}

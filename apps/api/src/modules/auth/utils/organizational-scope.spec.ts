import { Role, UserStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';
import {
  belongsToCompany,
  belongsToDirection,
  getUserCompanyId,
  getUserDirectionId,
  hasAnyRole,
} from './organizational-scope.js';

const baseUser: AuthenticatedUser = {
  id: 'u1',
  email: 'user@example.com',
  firstName: 'A',
  lastName: 'B',
  role: Role.EMPLOYEE,
  status: UserStatus.ACTIVE,
  companyId: 'company-a',
  directionId: 'direction-a',
  company: { id: 'company-a', name: 'A' },
  direction: { id: 'direction-a', name: 'Tech' },
};

describe('organizational-scope', () => {
  it('exposes company and direction context', () => {
    expect(getUserCompanyId(baseUser)).toBe('company-a');
    expect(getUserDirectionId(baseUser)).toBe('direction-a');
  });

  it('supports null direction without throwing', () => {
    const user = { ...baseUser, directionId: null, direction: null };
    expect(getUserDirectionId(user)).toBeNull();
    expect(belongsToDirection(user, 'direction-a')).toBe(false);
  });

  it('checks company membership', () => {
    expect(belongsToCompany(baseUser, 'company-a')).toBe(true);
    expect(belongsToCompany(baseUser, 'company-b')).toBe(false);
    expect(
      belongsToCompany({ ...baseUser, role: Role.GROUP_ADMIN }, 'company-b'),
    ).toBe(true);
  });

  it('checks roles', () => {
    expect(hasAnyRole(baseUser, [Role.EMPLOYEE])).toBe(true);
    expect(hasAnyRole(baseUser, [Role.GROUP_ADMIN])).toBe(false);
  });
});

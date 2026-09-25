import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

function createContext(user?: AuthenticatedUser) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };
}

describe('RolesGuard', () => {
  const user: AuthenticatedUser = {
    id: 'u1',
    email: 'employee@appatam.dev',
    firstName: 'Eden',
    lastName: 'Employee',
    role: Role.EMPLOYEE,
    status: UserStatus.ACTIVE,
    companyId: 'c1',
    directionId: null,
    company: { id: 'c1', name: 'Appatam' },
    direction: null,
  };

  it('allows when no roles metadata is set', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(user) as never)).toBe(true);
  });

  it('allows matching role', () => {
    const getAllAndOverride = vi
      .fn()
      .mockReturnValue([Role.EMPLOYEE, Role.MANAGER]);
    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(user) as never)).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('denies non-matching role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.GROUP_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(user) as never)).toThrow(
      ForbiddenException,
    );
  });
});

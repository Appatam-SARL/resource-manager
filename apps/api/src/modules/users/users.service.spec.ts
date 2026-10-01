import { ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { PasswordService } from '../auth/services/password.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { UsersService } from './users.service.js';

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'actor-1',
    email: 'actor@example.com',
    firstName: 'Awa',
    lastName: 'Koné',
    role: Role.COMPANY_ADMIN,
    status: UserStatus.ACTIVE,
    companyId: 'company-a',
    directionId: null,
    company: { id: 'company-a', name: 'Entreprise A' },
    direction: null,
    ...overrides,
  };
}

type StoredUser = {
  id: string;
  companyId: string;
  directionId: string | null;
  role: Role;
  status: UserStatus;
};

describe('UsersService — account protection', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    direction: { findUnique: ReturnType<typeof vi.fn> };
  };
  let realtime: { disconnectUser: ReturnType<typeof vi.fn> };

  const givenUser = (user: StoredUser) => {
    prisma.user.findUnique.mockResolvedValue(user);
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => Promise.resolve({ id: where.id })),
      },
      direction: { findUnique: vi.fn() },
    };
    realtime = { disconnectUser: vi.fn() };
    service = new UsersService(
      prisma as unknown as PrismaService,
      new AccessScopeService(),
      { hash: vi.fn().mockResolvedValue('hash') } as unknown as PasswordService,
      { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService,
      realtime as unknown as RealtimeService,
    );
  });

  describe('updateStatus', () => {
    it('refuses to deactivate its own account', async () => {
      givenUser({ id: 'actor-1', companyId: 'company-a', directionId: null, role: Role.COMPANY_ADMIN, status: UserStatus.ACTIVE });

      await expect(service.updateStatus('actor-1', { status: UserStatus.INACTIVE }, actor())).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('also protects a Group admin against self-deactivation', async () => {
      givenUser({ id: 'actor-1', companyId: 'company-a', directionId: null, role: Role.GROUP_ADMIN, status: UserStatus.ACTIVE });

      await expect(
        service.updateStatus('actor-1', { status: UserStatus.INACTIVE }, actor({ role: Role.GROUP_ADMIN })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents a Company admin from deactivating a Group admin of its company', async () => {
      givenUser({ id: 'group-admin', companyId: 'company-a', directionId: null, role: Role.GROUP_ADMIN, status: UserStatus.ACTIVE });

      await expect(service.updateStatus('group-admin', { status: UserStatus.INACTIVE }, actor())).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lets a Company admin deactivate an employee of its company, including one without direction', async () => {
      givenUser({ id: 'employee', companyId: 'company-a', directionId: null, role: Role.EMPLOYEE, status: UserStatus.ACTIVE });

      await service.updateStatus('employee', { status: UserStatus.INACTIVE }, actor());

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'employee' }, data: { status: UserStatus.INACTIVE } }),
      );
    });

    it('still refuses an employee of another company', async () => {
      givenUser({ id: 'employee-b', companyId: 'company-b', directionId: null, role: Role.EMPLOYEE, status: UserStatus.ACTIVE });

      await expect(service.updateStatus('employee-b', { status: UserStatus.INACTIVE }, actor())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets a Group admin deactivate another Group admin', async () => {
      givenUser({ id: 'other-group-admin', companyId: 'company-b', directionId: null, role: Role.GROUP_ADMIN, status: UserStatus.ACTIVE });

      await service.updateStatus('other-group-admin', { status: UserStatus.INACTIVE }, actor({ role: Role.GROUP_ADMIN }));

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('prevents a Company admin from editing a Group admin (e-mail / password takeover)', async () => {
      givenUser({ id: 'group-admin', companyId: 'company-a', directionId: null, role: Role.GROUP_ADMIN, status: UserStatus.ACTIVE });

      await expect(
        service.update('group-admin', { email: 'attacker@example.com', password: 'Password123!' }, actor()),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses to change its own role', async () => {
      givenUser({ id: 'actor-1', companyId: 'company-a', directionId: null, role: Role.COMPANY_ADMIN, status: UserStatus.ACTIVE });

      await expect(service.update('actor-1', { role: Role.EMPLOYEE }, actor())).rejects.toThrow(ForbiddenException);
    });

    it('allows editing its own profile when the role is sent unchanged', async () => {
      givenUser({ id: 'actor-1', companyId: 'company-a', directionId: null, role: Role.COMPANY_ADMIN, status: UserStatus.ACTIVE });

      await service.update('actor-1', { firstName: 'Awa', role: Role.COMPANY_ADMIN }, actor());

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('still prevents a Company admin from promoting someone to Group admin', async () => {
      givenUser({ id: 'employee', companyId: 'company-a', directionId: null, role: Role.EMPLOYEE, status: UserStatus.ACTIVE });

      await expect(service.update('employee', { role: Role.GROUP_ADMIN }, actor())).rejects.toThrow(ForbiddenException);
    });
  });

  describe('realtime sessions', () => {
    const employee = {
      id: 'employee',
      email: 'employee@example.com',
      companyId: 'company-a',
      directionId: null,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(employee);
      prisma.user.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...employee,
          ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
        }),
      );
    });

    it('closes the WebSocket sessions of a deactivated user', async () => {
      await service.updateStatus('employee', { status: UserStatus.INACTIVE }, actor());

      expect(realtime.disconnectUser).toHaveBeenCalledWith('employee');
    });

    it('keeps the sessions of a reactivated user untouched', async () => {
      await service.updateStatus('employee', { status: UserStatus.ACTIVE }, actor());

      expect(realtime.disconnectUser).not.toHaveBeenCalled();
    });

    it('closes the sessions when the role changes so rooms are recomputed on reconnection', async () => {
      await service.update('employee', { role: Role.MANAGER }, actor());

      expect(realtime.disconnectUser).toHaveBeenCalledWith('employee');
    });

    it('closes the sessions when the password changes', async () => {
      await service.update('employee', { password: 'Password123!' }, actor());

      expect(realtime.disconnectUser).toHaveBeenCalledWith('employee');
    });

    it('keeps the sessions for a cosmetic change', async () => {
      await service.update('employee', { firstName: 'Aya' }, actor());

      expect(realtime.disconnectUser).not.toHaveBeenCalled();
    });

    it('does not touch sessions when the update is refused', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...employee, companyId: 'company-b' });

      await expect(service.updateStatus('employee', { status: UserStatus.INACTIVE }, actor())).rejects.toThrow(
        ForbiddenException,
      );
      expect(realtime.disconnectUser).not.toHaveBeenCalled();
    });
  });
});

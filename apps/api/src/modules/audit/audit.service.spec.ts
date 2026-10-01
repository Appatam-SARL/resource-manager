import { AuditAction, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AuditService } from './audit.service.js';

function actor(role: Role, companyId = 'company-a'): AuthenticatedUser {
  return {
    id: 'actor-1',
    email: 'actor@example.com',
    firstName: 'Awa',
    lastName: 'Koné',
    role,
    status: UserStatus.ACTIVE,
    companyId,
    directionId: null,
    company: { id: companyId, name: 'Entreprise' },
    direction: null,
  };
}

describe('AuditService.list — organisational scope', () => {
  let service: AuditService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    auditLog: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn().mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries)),
      auditLog: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  const whereUsed = () => (prisma.auditLog.findMany.mock.calls[0][0] as { where: unknown }).where;

  it('gives the Group admin the whole Group', async () => {
    await service.list({ page: 1, limit: 20 }, actor(Role.GROUP_ADMIN));

    expect(whereUsed()).toEqual({});
  });

  it('restricts a Company admin to actions of non-Group-admin users of its company', async () => {
    await service.list({ page: 1, limit: 20 }, actor(Role.COMPANY_ADMIN, 'company-a'));

    expect(whereUsed()).toEqual({
      user: { is: { companyId: 'company-a', role: { not: Role.GROUP_ADMIN } } },
    });
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: whereUsed() });
  });

  it('keeps the company scope when client filters are combined (userId of another company)', async () => {
    await service.list(
      { page: 1, limit: 20, action: AuditAction.UPDATE, entity: 'Vehicle', userId: 'user-of-company-b' },
      actor(Role.COMPANY_ADMIN, 'company-a'),
    );

    expect(whereUsed()).toEqual({
      user: { is: { companyId: 'company-a', role: { not: Role.GROUP_ADMIN } } },
      action: AuditAction.UPDATE,
      entity: 'Vehicle',
      userId: 'user-of-company-b',
    });
  });
});

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  EquipmentScope,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
  Role,
  UserStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { AuditService } from '../audit/audit.service.js';
import { EquipmentAvailabilityService } from './equipment-availability.service.js';
import { EquipmentsService } from './equipments.service.js';

function makeUser(role: Role, id = 'user-1', companyId = 'company-a'): AuthenticatedUser {
  return {
    id,
    email: `${id}@example.com`,
    firstName: 'Jean',
    lastName: 'Dupont',
    role,
    status: UserStatus.ACTIVE,
    companyId,
    directionId: null,
    company: { id: companyId, name: 'Appatam' },
    direction: null,
  };
}

describe('EquipmentsService', () => {
  const groupAdmin = makeUser(Role.GROUP_ADMIN, 'group-admin');
  const companyAdmin = makeUser(Role.COMPANY_ADMIN, 'company-admin');
  const employee = makeUser(Role.EMPLOYEE, 'employee-1');
  const accessScope = new AccessScopeService();

  const projector = {
    id: 'eq-1',
    name: 'Vidéoprojecteur',
    description: null,
    quantity: 3,
    scope: EquipmentScope.ROOM,
    status: ResourceStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: {
    equipment: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    reservationEquipment: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    reservation: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let availability: EquipmentAvailabilityService;
  let service: EquipmentsService;

  beforeEach(() => {
    prisma = {
      equipment: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([projector]),
        findUnique: vi.fn().mockResolvedValue(projector),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(projector),
        update: vi.fn().mockResolvedValue(projector),
        delete: vi.fn().mockResolvedValue(projector),
      },
      reservationEquipment: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      reservation: { findUnique: vi.fn() },
      $transaction: vi.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => Promise<unknown>)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    availability = new EquipmentAvailabilityService(
      prisma as unknown as PrismaService,
      accessScope,
    );
    service = new EquipmentsService(
      prisma as unknown as PrismaService,
      accessScope,
      audit as unknown as AuditService,
      availability,
    );
  });

  describe('catalogue administration is reserved to GROUP_ADMIN', () => {
    it('lets a GROUP_ADMIN create an equipment and audits it', async () => {
      await service.create(
        { name: '  Vidéoprojecteur ', quantity: 3, scope: EquipmentScope.ROOM },
        groupAdmin,
      );

      expect(prisma.equipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Vidéoprojecteur', quantity: 3 }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.CREATE, entity: 'Equipment' }),
      );
    });

    it.each([
      ['COMPANY_ADMIN', companyAdmin],
      ['EMPLOYEE', employee],
    ])('forbids a %s to create, update, change the status or delete', async (_label, actor) => {
      await expect(
        service.create({ name: 'Micro', quantity: 1, scope: EquipmentScope.BOTH }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.update('eq-1', { quantity: 5 }, actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.updateStatus('eq-1', ResourceStatus.MAINTENANCE, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove('eq-1', actor)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.equipment.create).not.toHaveBeenCalled();
      expect(prisma.equipment.update).not.toHaveBeenCalled();
      expect(prisma.equipment.delete).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name (case-insensitive)', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-other' });

      await expect(
        service.create(
          { name: 'vidéoprojecteur', quantity: 1, scope: EquipmentScope.ROOM },
          groupAdmin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list visibility', () => {
    it('only lists AVAILABLE equipment outside GROUP_ADMIN, whatever the status filter', async () => {
      await service.list(employee, {
        page: 1,
        limit: 20,
        status: ResourceStatus.MAINTENANCE,
      });

      expect(prisma.equipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ResourceStatus.AVAILABLE }),
        }),
      );
    });

    it('hides a non-available equipment from non administrators', async () => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...projector,
        status: ResourceStatus.OUT_OF_SERVICE,
      });

      await expect(service.findById('eq-1', employee)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.findById('eq-1', groupAdmin)).resolves.toMatchObject({ id: 'eq-1' });
    });
  });

  describe('stock reduction', () => {
    const tomorrow = new Date(Date.now() + 24 * 3_600_000);
    const committed = (offsetMs: number, durationMs: number, quantity: number) => ({
      equipmentId: 'eq-1',
      quantity,
      reservation: {
        startAt: new Date(tomorrow.getTime() + offsetMs),
        endAt: new Date(tomorrow.getTime() + offsetMs + durationMs),
      },
    });

    it('refuses a quantity below the units committed on upcoming reservations', async () => {
      prisma.reservationEquipment.findMany.mockResolvedValue([
        committed(0, 3_600_000, 2),
        committed(1_800_000, 3_600_000, 1),
      ]);

      await expect(service.update('eq-1', { quantity: 2 }, groupAdmin)).rejects.toThrow(
        'Impossible de réduire le stock à 2 : 3 unité(s) sont déjà engagées sur des réservations à venir.',
      );
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.equipment.update).not.toHaveBeenCalled();
      expect(prisma.reservationEquipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation: expect.objectContaining({
              status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
            }),
          }),
        }),
      );
    });

    it('accepts a quantity that still covers the peak of simultaneous usage', async () => {
      prisma.reservationEquipment.findMany.mockResolvedValue([
        committed(0, 3_600_000, 2),
        committed(7_200_000, 3_600_000, 2),
      ]);

      await service.update('eq-1', { quantity: 2 }, groupAdmin);

      expect(prisma.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 2 } }),
      );
    });

    it('refuses a scope change that excludes upcoming reservations', async () => {
      prisma.reservationEquipment.count.mockResolvedValue(1);

      await expect(
        service.update('eq-1', { scope: EquipmentScope.VEHICLE }, groupAdmin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.reservationEquipment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          reservation: expect.objectContaining({ resourceType: { in: [ResourceType.ROOM] } }),
        }),
      });
    });
  });

  describe('removal', () => {
    it('refuses to delete an equipment used by reservations', async () => {
      prisma.reservationEquipment.count.mockResolvedValue(2);

      await expect(service.remove('eq-1', groupAdmin)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.equipment.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused equipment and audits it', async () => {
      await expect(service.remove('eq-1', groupAdmin)).resolves.toMatchObject({ deleted: true });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.DELETE, entity: 'Equipment' }),
      );
    });
  });

  describe('availability', () => {
    const startAt = new Date(Date.now() + 24 * 3_600_000);
    const endAt = new Date(startAt.getTime() + 3_600_000);

    it('exposes quantities only, never the reservations consuming the stock', async () => {
      prisma.equipment.findMany.mockResolvedValue([
        {
          id: 'eq-1',
          name: 'Vidéoprojecteur',
          description: null,
          scope: EquipmentScope.ROOM,
          quantity: 3,
        },
      ]);
      prisma.reservationEquipment.findMany.mockResolvedValue([
        {
          equipmentId: 'eq-1',
          quantity: 2,
          reservation: { startAt, endAt },
        },
      ]);

      const result = await availability.getAvailability(employee, {
        resourceType: ResourceType.ROOM,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

      expect(result).toEqual([
        {
          id: 'eq-1',
          name: 'Vidéoprojecteur',
          description: null,
          scope: EquipmentScope.ROOM,
          quantity: 3,
          availableQuantity: 1,
        },
      ]);
      expect(prisma.reservationEquipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            equipmentId: true,
            quantity: true,
            reservation: { select: { startAt: true, endAt: true } },
          },
        }),
      );
      expect(prisma.equipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ResourceStatus.AVAILABLE,
            scope: { in: [EquipmentScope.ROOM, EquipmentScope.BOTH] },
          },
          select: { id: true, name: true, description: true, scope: true, quantity: true },
        }),
      );
    });

    it('refuses to exclude a reservation the actor cannot see', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        companyId: 'company-a',
        directionId: null,
        userId: 'someone-else',
      });

      await expect(
        availability.getAvailability(employee, {
          resourceType: ResourceType.ROOM,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          excludeReservationId: 'res-other',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

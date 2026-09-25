import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EntityStatus,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
  Role,
  UserStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { AuditService } from '../audit/audit.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { ReservationsService } from './reservations.service.js';

function makeUser(
  overrides: Partial<AuthenticatedUser> &
    Pick<AuthenticatedUser, 'role' | 'companyId'>,
): AuthenticatedUser {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'user@example.com',
    firstName: overrides.firstName ?? 'Jean',
    lastName: overrides.lastName ?? 'Dupont',
    role: overrides.role,
    status: overrides.status ?? UserStatus.ACTIVE,
    companyId: overrides.companyId,
    directionId: overrides.directionId ?? null,
    company: overrides.company ?? {
      id: overrides.companyId,
      name: 'Appatam',
    },
    direction: overrides.direction ?? null,
  };
}

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: {
    vehicle: { findUnique: ReturnType<typeof vi.fn> };
    meetingRoom: { findUnique: ReturnType<typeof vi.fn> };
    reservation: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    user: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let notifications: { createManyForUsers: ReturnType<typeof vi.fn> };
  const accessScope = new AccessScopeService();

  const futureStart = new Date(Date.now() + 3_600_000).toISOString();
  const futureEnd = new Date(Date.now() + 7_200_000).toISOString();

  beforeEach(() => {
    prisma = {
      vehicle: { findUnique: vi.fn() },
      meetingRoom: { findUnique: vi.fn() },
      reservation: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    notifications = {
      createManyForUsers: vi.fn().mockResolvedValue({ count: 0 }),
    };

    service = new ReservationsService(
      prisma as unknown as PrismaService,
      accessScope,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('create — conflicts', () => {
    it('rejects overlapping PENDING/APPROVED vehicle reservations', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'existing-1',
          status: ReservationStatus.APPROVED,
          startAt: new Date(futureStart),
          endAt: new Date(futureEnd),
        },
      ]);

      await expect(
        service.create(
          {
            resourceType: ResourceType.VEHICLE,
            vehicleId: 'vehicle-1',
            startAt: futureStart,
            endAt: futureEnd,
            destination: 'Abidjan',
            missionReason: 'Mission client',
            passengerCount: 2,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('ignores CANCELLED/REJECTED when checking conflicts', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });
      // findConflicts queries status in PENDING|APPROVED — empty = no conflict
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.reservation.create.mockResolvedValue({
        id: 'res-1',
        companyId: 'company-a',
        userId: actor.id,
        resourceType: ResourceType.VEHICLE,
        vehicleId: 'vehicle-1',
        status: ReservationStatus.PENDING,
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.create(
        {
          resourceType: ResourceType.VEHICLE,
          vehicleId: 'vehicle-1',
          startAt: futureStart,
          endAt: futureEnd,
          destination: 'Abidjan',
          missionReason: 'Mission client',
          passengerCount: 2,
        },
        actor,
      );

      expect(result.id).toBe('res-1');
      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
          }),
        }),
      );
    });
  });

  describe('create — capacity', () => {
    it('rejects passengerCount greater than vehicle seats', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 4,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });

      await expect(
        service.create(
          {
            resourceType: ResourceType.VEHICLE,
            vehicleId: 'vehicle-1',
            startAt: futureStart,
            endAt: futureEnd,
            destination: 'Abidjan',
            missionReason: 'Mission',
            passengerCount: 8,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects participantCount greater than room capacity', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.meetingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        companyId: 'company-a',
        capacity: 10,
        status: ResourceStatus.AVAILABLE,
        name: 'Salle A',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });

      await expect(
        service.create(
          {
            resourceType: ResourceType.ROOM,
            roomId: 'room-1',
            startAt: futureStart,
            endAt: futureEnd,
            meetingSubject: 'Réunion',
            participantCount: 20,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create — cross-company', () => {
    it('forbids reserving a vehicle from another company', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-b',
        companyId: 'company-b',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'BB-001-CC',
        company: { id: 'company-b', status: EntityStatus.ACTIVE, name: 'B' },
      });

      await expect(
        service.create(
          {
            resourceType: ResourceType.VEHICLE,
            vehicleId: 'vehicle-b',
            startAt: futureStart,
            endAt: futureEnd,
            destination: 'Abidjan',
            missionReason: 'Mission',
            passengerCount: 2,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stores companyId from the resource, not from the actor alone', async () => {
      const actor = makeUser({
        role: Role.GROUP_ADMIN,
        companyId: 'company-admin-home',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-resource',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: {
          id: 'company-resource',
          status: EntityStatus.ACTIVE,
          name: 'Resource Co',
        },
      });
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.reservation.create.mockResolvedValue({
        id: 'res-1',
        companyId: 'company-resource',
      });
      prisma.user.findMany.mockResolvedValue([]);

      await service.create(
        {
          resourceType: ResourceType.VEHICLE,
          vehicleId: 'vehicle-1',
          startAt: futureStart,
          endAt: futureEnd,
          destination: 'Abidjan',
          missionReason: 'Mission',
          passengerCount: 2,
        },
        actor,
      );

      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-resource',
            vehicleId: 'vehicle-1',
            userId: actor.id,
          }),
        }),
      );
    });
  });

  describe('create — inactive company / unavailable resource', () => {
    it('rejects reservation when company is inactive', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.INACTIVE, name: 'A' },
      });

      await expect(
        service.create(
          {
            resourceType: ResourceType.VEHICLE,
            vehicleId: 'vehicle-1',
            startAt: futureStart,
            endAt: futureEnd,
            destination: 'Abidjan',
            missionReason: 'Mission',
            passengerCount: 2,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reservation when vehicle is in maintenance', async () => {
      const actor = makeUser({
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });

      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 5,
        status: ResourceStatus.MAINTENANCE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });

      await expect(
        service.create(
          {
            resourceType: ResourceType.VEHICLE,
            vehicleId: 'vehicle-1',
            startAt: futureStart,
            endAt: futureEnd,
            destination: 'Abidjan',
            missionReason: 'Mission',
            passengerCount: 2,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

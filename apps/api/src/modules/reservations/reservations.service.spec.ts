import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EntityStatus,
  NotificationType,
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
import type { RealtimeService } from '../realtime/realtime.service.js';
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
      updateMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    user: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let notifications: { createManyForUsers: ReturnType<typeof vi.fn> };
  let realtime: { publishReservation: ReturnType<typeof vi.fn> };
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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn(),
        count: vi.fn(),
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(
        (work: (tx: unknown) => Promise<unknown>): Promise<unknown> => work(prisma),
      ),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    notifications = {
      createManyForUsers: vi.fn().mockResolvedValue([]),
    };
    realtime = { publishReservation: vi.fn() };

    service = new ReservationsService(
      prisma as unknown as PrismaService,
      accessScope,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      realtime as unknown as RealtimeService,
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

  describe('calendar', () => {
    it('scopes an employee to his reservations and exposes display fields', async () => {
      const actor = makeUser({ id: 'employee-1', role: Role.EMPLOYEE, companyId: 'company-a' });
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          status: ReservationStatus.APPROVED,
          resourceType: ResourceType.VEHICLE,
          vehicleId: 'vehicle-1',
          roomId: null,
          companyId: 'company-a',
          startAt: new Date('2026-09-28T09:00:00.000Z'),
          endAt: new Date('2026-09-28T11:00:00.000Z'),
          destination: 'Cocody',
          meetingSubject: null,
          userId: 'employee-1',
          user: { firstName: 'Koné', lastName: 'Nonwa' },
          vehicle: { registrationNumber: 'AB-1234-AA', brand: 'Toyota', model: 'Corolla' },
          room: null,
        },
      ]);

      const events = await service.calendar(actor, {
        startDate: '2026-09-28T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
      });

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([{ AND: [{ userId: 'employee-1' }, {}] }]),
          },
        }),
      );
      expect(events[0]).toMatchObject({
        id: 'res-1',
        title: 'AB-1234-AA',
        resourceName: 'Toyota Corolla',
        resourceDetail: 'AB-1234-AA',
        context: 'Cocody',
        userId: 'employee-1',
        requesterName: 'Koné Nonwa',
      });
    });
  });

  describe('extend', () => {
    const owner = makeUser({ id: 'owner-1', role: Role.EMPLOYEE, companyId: 'company-a' });
    const currentStart = new Date(Date.now() - 3_600_000);
    const currentEnd = new Date(Date.now() + 3_600_000);
    const newEndAt = new Date(currentEnd.getTime() + 3_600_000).toISOString();
    const approvedInProgress = {
      id: 'res-1',
      companyId: 'company-a',
      userId: 'owner-1',
      directionId: null,
      resourceType: ResourceType.VEHICLE,
      vehicleId: 'vehicle-1',
      roomId: null,
      startAt: currentStart,
      endAt: currentEnd,
      status: ReservationStatus.APPROVED,
    };

    beforeEach(() => {
      prisma.reservation.findUnique.mockResolvedValue(approvedInProgress);
      prisma.reservation.findUniqueOrThrow.mockResolvedValue({
        ...approvedInProgress,
        endAt: new Date(newEndAt),
      });
      prisma.vehicle.findUnique.mockResolvedValue({
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { status: EntityStatus.ACTIVE },
      });
    });

    it('extends an in-progress approved reservation and keeps its status', async () => {
      const result = await service.extend('res-1', { newEndAt }, owner);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-1',
            startAt: { lt: new Date(newEndAt) },
            endAt: { gt: currentEnd },
            id: { not: 'res-1' },
          }),
        }),
      );
      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'res-1',
          status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] },
          endAt: currentEnd,
        },
        data: { endAt: new Date(newEndAt) },
      });
      expect(result.status).toBe(ReservationStatus.APPROVED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ operation: 'EXTEND' }),
        }),
      );
    });

    it('rejects a conflict on the additional period', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'other',
          status: ReservationStatus.APPROVED,
          startAt: new Date(currentEnd.getTime() + 1_800_000),
          endAt: new Date(currentEnd.getTime() + 7_200_000),
        },
      ]);

      await expect(service.extend('res-1', { newEndAt }, owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a new end that is not after the current end', async () => {
      await expect(
        service.extend('res-1', { newEndAt: currentEnd.toISOString() }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an extension longer than 24 hours', async () => {
      const tooLate = new Date(currentEnd.getTime() + 25 * 3_600_000).toISOString();
      await expect(
        service.extend('res-1', { newEndAt: tooLate }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects closed or finished reservations', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...approvedInProgress,
        status: ReservationStatus.CANCELLED,
      });
      await expect(service.extend('res-1', { newEndAt }, owner)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      prisma.reservation.findUnique.mockResolvedValue({
        ...approvedInProgress,
        endAt: new Date(Date.now() - 60_000),
      });
      await expect(service.extend('res-1', { newEndAt }, owner)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a resource that went into maintenance', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({
        status: ResourceStatus.MAINTENANCE,
        registrationNumber: 'AA-001-BB',
        company: { status: EntityStatus.ACTIVE },
      });
      await expect(service.extend('res-1', { newEndAt }, owner)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('forbids another employee and another company admin', async () => {
      const colleague = makeUser({ id: 'employee-2', role: Role.EMPLOYEE, companyId: 'company-a' });
      await expect(
        service.extend('res-1', { newEndAt }, colleague),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const otherAdmin = makeUser({ id: 'admin-b', role: Role.COMPANY_ADMIN, companyId: 'company-b' });
      await expect(
        service.extend('res-1', { newEndAt }, otherAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('fails without notifying when the reservation changed concurrently', async () => {
      prisma.reservation.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.extend('res-1', { newEndAt }, owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(notifications.createManyForUsers).not.toHaveBeenCalled();
    });

    it('publishes reservation.extended with availability change after the locked update', async () => {
      await service.extend('res-1', { newEndAt }, owner);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(realtime.publishReservation).toHaveBeenCalledWith(
        'reservation.extended',
        expect.objectContaining({ id: 'res-1' }),
        { availabilityChanged: true },
      );
    });

    it('notifies approvers but not the owner who extended it', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      await service.extend('res-1', { newEndAt }, owner);

      expect(notifications.createManyForUsers).toHaveBeenCalledTimes(1);
      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          type: NotificationType.RESERVATION_EXTENDED,
          entityId: 'res-1',
        }),
      );
    });
  });

  describe('notifications', () => {
    const owner = 'owner-1';
    const pendingReservation = {
      id: 'res-1',
      companyId: 'company-a',
      userId: owner,
      directionId: null,
      resourceType: ResourceType.ROOM,
      vehicleId: null,
      roomId: 'room-1',
      startAt: new Date(futureStart),
      endAt: new Date(futureEnd),
      status: ReservationStatus.PENDING,
    };
    const companyAdmin = makeUser({
      id: 'admin-1',
      role: Role.COMPANY_ADMIN,
      companyId: 'company-a',
    });

    beforeEach(() => {
      prisma.reservation.findUnique.mockResolvedValue(pendingReservation);
      prisma.reservation.findUniqueOrThrow.mockResolvedValue(pendingReservation);
    });

    it('notifies the owner once when a reservation is approved', async () => {
      await service.approve('res-1', companyAdmin);

      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'res-1', status: { in: [ReservationStatus.PENDING] } },
        data: { status: ReservationStatus.APPROVED },
      });
      expect(notifications.createManyForUsers).toHaveBeenCalledTimes(1);
      expect(notifications.createManyForUsers).toHaveBeenCalledWith([owner], {
        type: NotificationType.RESERVATION_APPROVED,
        title: 'Réservation approuvée',
        body: 'Votre réservation a été approuvée.',
        entityType: 'Reservation',
        entityId: 'res-1',
      });
    });

    it('does not notify twice when a concurrent call already approved it', async () => {
      prisma.reservation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve('res-1', companyAdmin)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(notifications.createManyForUsers).not.toHaveBeenCalled();
    });

    it('includes the rejection reason in the owner notification', async () => {
      await service.reject(
        'res-1',
        { rejectionReason: 'Salle réservée pour la direction' },
        companyAdmin,
      );

      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        [owner],
        expect.objectContaining({
          type: NotificationType.RESERVATION_REJECTED,
          title: 'Réservation rejetée',
          body: 'Votre réservation a été rejetée. Motif : Salle réservée pour la direction',
        }),
      );
    });

    it('notifies the owner and the other approvers when an admin cancels', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'manager-1' },
      ]);

      await service.cancel('res-1', companyAdmin);

      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        [owner],
        expect.objectContaining({
          type: NotificationType.RESERVATION_CANCELLED,
          body: 'Votre réservation a été annulée.',
        }),
      );
      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        ['manager-1'],
        expect.objectContaining({
          type: NotificationType.RESERVATION_CANCELLED,
          body: 'Une réservation a été annulée.',
        }),
      );
    });

    it('confirms creation to the requester and alerts approvers (not the author)', async () => {
      const actor = makeUser({
        id: 'employee-1',
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
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.reservation.create.mockResolvedValue({ id: 'res-new' });
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.create(
        {
          resourceType: ResourceType.ROOM,
          roomId: 'room-1',
          startAt: futureStart,
          endAt: futureEnd,
          meetingSubject: 'Point hebdo',
          participantCount: 4,
        },
        actor,
      );

      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        ['employee-1'],
        expect.objectContaining({
          type: NotificationType.RESERVATION_CREATED,
          title: 'Nouvelle réservation',
          body: 'Votre demande de réservation a été enregistrée.',
          entityId: 'res-new',
        }),
      );
      expect(notifications.createManyForUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          type: NotificationType.RESERVATION_CREATED,
          body: 'Une demande de réservation a été créée pour la salle Salle A.',
        }),
      );
    });
  });

  describe('realtime publication and resource lock', () => {
    const actor = makeUser({ id: 'employee-1', role: Role.EMPLOYEE, companyId: 'company-a' });
    const vehicleDto = {
      resourceType: ResourceType.VEHICLE,
      vehicleId: 'vehicle-1',
      startAt: futureStart,
      endAt: futureEnd,
      destination: 'Abidjan',
      missionReason: 'Mission client',
      passengerCount: 2,
    };
    const pending = {
      id: 'res-1',
      companyId: 'company-a',
      userId: 'employee-1',
      directionId: null,
      resourceType: ResourceType.VEHICLE,
      vehicleId: 'vehicle-1',
      roomId: null,
      startAt: new Date(futureStart),
      endAt: new Date(futureEnd),
      status: ReservationStatus.PENDING,
    };
    const companyAdmin = makeUser({ id: 'admin-1', role: Role.COMPANY_ADMIN, companyId: 'company-a' });

    beforeEach(() => {
      prisma.vehicle.findUnique.mockResolvedValue({
        id: 'vehicle-1',
        companyId: 'company-a',
        seats: 5,
        status: ResourceStatus.AVAILABLE,
        registrationNumber: 'AA-001-BB',
        company: { id: 'company-a', status: EntityStatus.ACTIVE, name: 'A' },
      });
      prisma.reservation.create.mockResolvedValue(pending);
      prisma.reservation.findUnique.mockResolvedValue(pending);
      prisma.reservation.findUniqueOrThrow.mockResolvedValue(pending);
    });

    it('checks conflicts and inserts inside one transaction holding a lock on the resource', async () => {
      await service.create(vehicleDto, actor);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const [sql, lockKey] = prisma.$executeRaw.mock.calls[0] as [TemplateStringsArray, string];
      expect(sql.join('?')).toContain('pg_advisory_xact_lock');
      expect(lockKey).toBe('reservation:VEHICLE:vehicle-1');
      const lockOrder = prisma.$executeRaw.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(prisma.reservation.findMany.mock.invocationCallOrder[0]);
      expect(prisma.reservation.findMany.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.reservation.create.mock.invocationCallOrder[0],
      );
    });

    it('publishes reservation.created with availability change only after the insert succeeded', async () => {
      await service.create(vehicleDto, actor);

      expect(realtime.publishReservation).toHaveBeenCalledWith('reservation.created', pending, {
        availabilityChanged: true,
      });
      expect(realtime.publishReservation.mock.invocationCallOrder[0]).toBeGreaterThan(
        prisma.reservation.create.mock.invocationCallOrder[0],
      );
    });

    it('publishes nothing when the slot is already taken (conflict)', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        { id: 'other', status: ReservationStatus.APPROVED, startAt: new Date(futureStart), endAt: new Date(futureEnd) },
      ]);

      await expect(service.create(vehicleDto, actor)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.reservation.create).not.toHaveBeenCalled();
      expect(realtime.publishReservation).not.toHaveBeenCalled();
    });

    it('publishes nothing when the database write fails', async () => {
      prisma.reservation.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.create(vehicleDto, actor)).rejects.toThrow('connection lost');
      expect(realtime.publishReservation).not.toHaveBeenCalled();
    });

    it('publishes nothing when the actor is not allowed (other company)', async () => {
      const outsider = makeUser({ id: 'employee-b', role: Role.EMPLOYEE, companyId: 'company-b' });

      await expect(service.create(vehicleDto, outsider)).rejects.toBeInstanceOf(ForbiddenException);
      expect(realtime.publishReservation).not.toHaveBeenCalled();
    });

    it('publishes reservation.approved without availability change (PENDING already blocks)', async () => {
      await service.approve('res-1', companyAdmin);

      expect(realtime.publishReservation).toHaveBeenCalledWith('reservation.approved', pending, {
        availabilityChanged: false,
      });
    });

    it('publishes reservation.rejected and reservation.cancelled with availability change', async () => {
      await service.reject('res-1', { rejectionReason: 'Véhicule indisponible' }, companyAdmin);
      await service.cancel('res-1', actor);

      expect(realtime.publishReservation).toHaveBeenCalledWith('reservation.rejected', pending, {
        availabilityChanged: true,
      });
      expect(realtime.publishReservation).toHaveBeenCalledWith('reservation.cancelled', pending, {
        availabilityChanged: true,
      });
    });

    it('publishes reservation.updated after a locked update', async () => {
      prisma.reservation.update.mockResolvedValue(pending);
      prisma.reservation.findUnique.mockResolvedValue({ ...pending, passengerCount: 2, vehicle: { seats: 5 } });

      await service.update('res-1', { destination: 'Cocody' }, actor);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(realtime.publishReservation).toHaveBeenCalledWith('reservation.updated', pending, {
        availabilityChanged: true,
      });
    });

    it('publishes nothing when a concurrent call already processed the reservation', async () => {
      prisma.reservation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve('res-1', companyAdmin)).rejects.toBeInstanceOf(ConflictException);
      expect(realtime.publishReservation).not.toHaveBeenCalled();
    });
  });
});

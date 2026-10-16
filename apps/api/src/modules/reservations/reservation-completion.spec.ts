import { AuditAction, ReservationStatus, ResourceType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import { REALTIME_EVENTS } from '../realtime/realtime.constants.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { ReservationCompletionScheduler } from './reservation-completion.scheduler.js';
import {
  COMPLETION_CATCH_UP_INTERVAL_MS,
  ReservationsService,
} from './reservations.service.js';

type StoredReservation = {
  id: string;
  companyId: string;
  directionId: string | null;
  userId: string;
  resourceType: ResourceType;
  vehicleId: string | null;
  roomId: string | null;
  status: ReservationStatus;
  startAt: Date;
  endAt: Date;
  updatedAt: Date;
};

type CompletionWhere = {
  status?: ReservationStatus;
  endAt?: { lte: Date };
  id?: { in: string[] };
};

function matches(reservation: StoredReservation, where: CompletionWhere): boolean {
  if (where.status && reservation.status !== where.status) return false;
  if (where.endAt && reservation.endAt > where.endAt.lte) return false;
  if (where.id && !where.id.in.includes(reservation.id)) return false;
  return true;
}

/** Minimal in-memory reservation table honouring the filters used by the completion. */
function createReservationStore(rows: StoredReservation[]) {
  return {
    rows,
    findMany: vi.fn(async ({ where, take }: { where: CompletionWhere; take?: number }) =>
      rows
        .filter((row) => matches(row, where))
        .slice(0, take)
        .map((row) => ({ ...row, room: { companyId: row.companyId, status: 'AVAILABLE' } })),
    ),
    updateMany: vi.fn(
      async ({ where, data }: { where: CompletionWhere; data: { status: ReservationStatus } }) => {
        const targets = rows.filter((row) => matches(row, where));
        for (const row of targets) row.status = data.status;
        return { count: targets.length };
      },
    ),
  };
}

const NOW = new Date('2026-10-06T10:00:00.000Z');
const HOUR = 3_600_000;

function makeReservation(
  id: string,
  status: ReservationStatus,
  startOffsetHours: number,
  endOffsetHours: number,
): StoredReservation {
  return {
    id,
    companyId: 'company-a',
    directionId: null,
    userId: 'user-1',
    resourceType: ResourceType.ROOM,
    vehicleId: null,
    roomId: 'room-1',
    status,
    startAt: new Date(NOW.getTime() + startOffsetHours * HOUR),
    endAt: new Date(NOW.getTime() + endOffsetHours * HOUR),
    updatedAt: NOW,
  };
}

describe('ReservationsService — automatic completion', () => {
  let store: ReturnType<typeof createReservationStore>;
  let audit: { log: ReturnType<typeof vi.fn> };
  let notifications: { createManyForUsers: ReturnType<typeof vi.fn> };
  let realtime: { publishReservation: ReturnType<typeof vi.fn> };
  let service: ReservationsService;

  function buildService(rows: StoredReservation[]): void {
    store = createReservationStore(rows);
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    notifications = { createManyForUsers: vi.fn().mockResolvedValue([]) };
    realtime = { publishReservation: vi.fn() };
    service = new ReservationsService(
      { reservation: store } as unknown as PrismaService,
      new AccessScopeService(),
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      realtime as unknown as RealtimeService,
    );
  }

  function statusOf(id: string): ReservationStatus | undefined {
    return store.rows.find((row) => row.id === id)?.status;
  }

  beforeEach(() => {
    buildService([
      makeReservation('approved-ended', ReservationStatus.APPROVED, -3, -1),
      makeReservation('approved-ending-now', ReservationStatus.APPROVED, -1, 0),
      makeReservation('approved-in-progress', ReservationStatus.APPROVED, -1, 1),
      makeReservation('approved-future', ReservationStatus.APPROVED, 2, 3),
      makeReservation('pending-ended', ReservationStatus.PENDING, -3, -1),
      makeReservation('cancelled-ended', ReservationStatus.CANCELLED, -3, -1),
      makeReservation('rejected-ended', ReservationStatus.REJECTED, -3, -1),
      makeReservation('completed-ended', ReservationStatus.COMPLETED, -5, -4),
    ]);
  });

  it('marks APPROVED reservations whose end is reached as COMPLETED', async () => {
    const count = await service.completeEndedReservations(NOW);

    expect(count).toBe(2);
    expect(statusOf('approved-ended')).toBe(ReservationStatus.COMPLETED);
    expect(statusOf('approved-ending-now')).toBe(ReservationStatus.COMPLETED);
  });

  it('leaves in-progress and future APPROVED reservations unchanged', async () => {
    await service.completeEndedReservations(NOW);

    expect(statusOf('approved-in-progress')).toBe(ReservationStatus.APPROVED);
    expect(statusOf('approved-future')).toBe(ReservationStatus.APPROVED);
  });

  it('leaves ended PENDING reservations unchanged', async () => {
    await service.completeEndedReservations(NOW);

    expect(statusOf('pending-ended')).toBe(ReservationStatus.PENDING);
  });

  it('never touches CANCELLED, REJECTED or already COMPLETED reservations', async () => {
    await service.completeEndedReservations(NOW);

    expect(statusOf('cancelled-ended')).toBe(ReservationStatus.CANCELLED);
    expect(statusOf('rejected-ended')).toBe(ReservationStatus.REJECTED);
    expect(statusOf('completed-ended')).toBe(ReservationStatus.COMPLETED);
  });

  it('is idempotent: a second call completes nothing', async () => {
    await service.completeEndedReservations(NOW);
    audit.log.mockClear();
    realtime.publishReservation.mockClear();

    const secondCount = await service.completeEndedReservations(NOW);

    expect(secondCount).toBe(0);
    expect(audit.log).not.toHaveBeenCalled();
    expect(realtime.publishReservation).not.toHaveBeenCalled();
  });

  it('writes one system audit entry and one realtime event per completion, without notification', async () => {
    await service.completeEndedReservations(NOW);

    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        action: AuditAction.STATUS_CHANGE,
        entity: 'Reservation',
        entityId: 'approved-ended',
      }),
    );
    expect(realtime.publishReservation).toHaveBeenCalledTimes(2);
    expect(realtime.publishReservation).toHaveBeenCalledWith(
      REALTIME_EVENTS.RESERVATION_UPDATED,
      expect.objectContaining({ id: 'approved-ended', status: ReservationStatus.COMPLETED }),
      { availabilityChanged: false },
    );
    expect(notifications.createManyForUsers).not.toHaveBeenCalled();
  });

  it('an extended reservation only completes after its new end', async () => {
    buildService([makeReservation('extended', ReservationStatus.APPROVED, -2, 0.5)]);

    expect(await service.completeEndedReservations(NOW)).toBe(0);
    expect(statusOf('extended')).toBe(ReservationStatus.APPROVED);

    const afterNewEnd = new Date(NOW.getTime() + HOUR);
    expect(await service.completeEndedReservations(afterNewEnd)).toBe(1);
    expect(statusOf('extended')).toBe(ReservationStatus.COMPLETED);
  });

  it('read-path catch-up runs at most once per minute and never throws', async () => {
    await service.completeEndedReservationsIfStale(NOW);
    await service.completeEndedReservationsIfStale(new Date(NOW.getTime() + 1_000));
    expect(store.updateMany).toHaveBeenCalledTimes(1);

    store.findMany.mockRejectedValueOnce(new Error('database down'));
    await expect(
      service.completeEndedReservationsIfStale(
        new Date(NOW.getTime() + COMPLETION_CATCH_UP_INTERVAL_MS),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('ReservationCompletionScheduler', () => {
  it('runs the completion and returns the count', async () => {
    const reservationsService = {
      completeEndedReservations: vi.fn().mockResolvedValue(3),
    };
    const scheduler = new ReservationCompletionScheduler(
      reservationsService as unknown as ReservationsService,
    );

    await expect(scheduler.completeEndedReservations()).resolves.toBe(3);
    expect(reservationsService.completeEndedReservations).toHaveBeenCalledTimes(1);
  });

  it('absorbs errors so the process never crashes', async () => {
    const reservationsService = {
      completeEndedReservations: vi.fn().mockRejectedValue(new Error('database down')),
    };
    const scheduler = new ReservationCompletionScheduler(
      reservationsService as unknown as ReservationsService,
    );

    await expect(scheduler.completeEndedReservations()).resolves.toBe(0);
    expect(() => scheduler.onApplicationBootstrap()).not.toThrow();
  });
});

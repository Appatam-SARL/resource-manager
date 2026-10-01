import {
  NotificationType,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
  type Notification,
} from '@prisma/client';
import type { Namespace } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actors, companies, directions, vehicles } from '../../../test/fixtures/organization.js';
import { REALTIME_EVENTS } from './realtime.constants.js';
import { RealtimeService } from './realtime.service.js';
import type { RealtimeReservationSource } from './realtime.types.js';

const reservation: RealtimeReservationSource = {
  id: 'res-1',
  companyId: companies.appatam.id,
  directionId: directions.tech.id,
  userId: actors.employeeA.id,
  resourceType: ResourceType.VEHICLE,
  vehicleId: vehicles.corollaA.id,
  roomId: null,
  status: ReservationStatus.PENDING,
  startAt: new Date('2026-10-01T08:00:00.000Z'),
  endAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-30T12:00:00.000Z'),
  vehicle: { status: ResourceStatus.AVAILABLE },
  room: null,
};

describe('RealtimeService', () => {
  let service: RealtimeService;
  let emit: ReturnType<typeof vi.fn>;
  let disconnectSockets: ReturnType<typeof vi.fn>;
  let server: { to: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    emit = vi.fn();
    disconnectSockets = vi.fn();
    server = {
      to: vi.fn(() => ({ emit })),
      in: vi.fn(() => ({ disconnectSockets })),
    };
    service = new RealtimeService();
    service.bindServer(server as unknown as Namespace);
  });

  it('does nothing before the gateway is initialised', () => {
    const unbound = new RealtimeService();
    expect(() =>
      unbound.publishReservation(REALTIME_EVENTS.RESERVATION_CREATED, reservation, { availabilityChanged: true }),
    ).not.toThrow();
  });

  it('reservation.created targets only the audience allowed to read the reservation', () => {
    service.publishReservation(REALTIME_EVENTS.RESERVATION_CREATED, reservation, { availabilityChanged: false });

    expect(server.to).toHaveBeenCalledTimes(1);
    expect(server.to).toHaveBeenCalledWith([
      'group',
      `company:${companies.appatam.id}:reservations`,
      `user:${actors.employeeA.id}`,
      `direction:${directions.tech.id}:reservations`,
    ]);
    expect(emit).toHaveBeenCalledWith(REALTIME_EVENTS.RESERVATION_CREATED, {
      eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      type: REALTIME_EVENTS.RESERVATION_CREATED,
      timestamp: expect.any(String),
      data: {
        reservationId: 'res-1',
        companyId: companies.appatam.id,
        directionId: directions.tech.id,
        userId: actors.employeeA.id,
        resourceType: ResourceType.VEHICLE,
        resourceId: vehicles.corollaA.id,
        status: ReservationStatus.PENDING,
        startAt: '2026-10-01T08:00:00.000Z',
        endAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-09-30T12:00:00.000Z',
      },
    });
  });

  it.each([
    REALTIME_EVENTS.RESERVATION_UPDATED,
    REALTIME_EVENTS.RESERVATION_APPROVED,
    REALTIME_EVENTS.RESERVATION_REJECTED,
    REALTIME_EVENTS.RESERVATION_CANCELLED,
    REALTIME_EVENTS.RESERVATION_EXTENDED,
  ] as const)('publishes %s with the same scoped audience', (type) => {
    service.publishReservation(type, reservation, { availabilityChanged: false });
    expect(emit).toHaveBeenCalledWith(type, expect.objectContaining({ type }));
  });

  it('resource.availability.changed goes to the whole company without reservation details', () => {
    service.publishReservation(REALTIME_EVENTS.RESERVATION_CANCELLED, reservation, { availabilityChanged: true });

    expect(server.to).toHaveBeenLastCalledWith(['group', `company:${companies.appatam.id}`]);
    const [event, envelope] = emit.mock.calls.at(-1) as [string, { data: Record<string, unknown> }];
    expect(event).toBe(REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED);
    expect(envelope.data).toEqual({
      resourceType: ResourceType.VEHICLE,
      resourceId: vehicles.corollaA.id,
      companyId: companies.appatam.id,
      reason: 'RESERVATION_CHANGED',
      resourceStatus: ResourceStatus.AVAILABLE,
      changedAt: expect.any(String),
    });
    expect(envelope.data).not.toHaveProperty('userId');
    expect(envelope.data).not.toHaveProperty('reservationId');
  });

  it('never exposes requester identity, comments or rejection reason in reservation events', () => {
    service.publishReservation(
      REALTIME_EVENTS.RESERVATION_REJECTED,
      { ...reservation, rejectionReason: 'Motif interne', comment: 'Privé', user: { email: 'x@y.z' } } as RealtimeReservationSource,
      { availabilityChanged: false },
    );
    const serialized = JSON.stringify(emit.mock.calls);
    expect(serialized).not.toContain('Motif interne');
    expect(serialized).not.toContain('Privé');
    expect(serialized).not.toContain('x@y.z');
  });

  it('publishes resource status changes as resource.availability.changed', () => {
    service.publishResourceAvailability(
      ResourceType.ROOM,
      { id: 'room-1', companyId: companies.entrepriseB.id, status: ResourceStatus.MAINTENANCE, updatedAt: new Date('2026-09-30T12:00:00.000Z') },
      'STATUS_CHANGED',
    );

    expect(server.to).toHaveBeenCalledWith(['group', `company:${companies.entrepriseB.id}`]);
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED,
      expect.objectContaining({
        data: expect.objectContaining({ resourceId: 'room-1', reason: 'STATUS_CHANGED', resourceStatus: ResourceStatus.MAINTENANCE }),
      }),
    );
  });

  it('publishes resource.created, resource.updated and resource.deleted to the owning company', () => {
    const resource = { id: 'veh-9', companyId: companies.appatam.id, status: ResourceStatus.AVAILABLE, updatedAt: new Date() };
    service.publishResourceCreated(ResourceType.VEHICLE, resource);
    service.publishResourceUpdated(ResourceType.VEHICLE, resource);
    service.publishResourceDeleted(ResourceType.VEHICLE, resource);

    expect(emit.mock.calls.map(([event]) => event as string)).toEqual([
      REALTIME_EVENTS.RESOURCE_CREATED,
      REALTIME_EVENTS.RESOURCE_UPDATED,
      REALTIME_EVENTS.RESOURCE_DELETED,
    ]);
  });

  it('sends each notification to its recipient personal room only', () => {
    const notification: Notification = {
      id: 'notif-1',
      userId: actors.employeeA.id,
      type: NotificationType.RESERVATION_APPROVED,
      title: 'Réservation approuvée',
      body: 'Votre réservation a été approuvée.',
      entityType: 'Reservation',
      entityId: 'res-1',
      readAt: null,
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
    };

    service.publishNotifications([notification, { ...notification, id: 'notif-2', userId: actors.companyAdminA.id }]);

    expect(server.to).toHaveBeenNthCalledWith(1, [`user:${actors.employeeA.id}`]);
    expect(server.to).toHaveBeenNthCalledWith(2, [`user:${actors.companyAdminA.id}`]);
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.NOTIFICATION_CREATED,
      expect.objectContaining({ data: expect.objectContaining({ notificationId: 'notif-1', entityId: 'res-1' }) }),
    );
  });

  it('never throws when the transport fails (REST operation must not fail)', () => {
    emit.mockImplementation(() => {
      throw new Error('adapter down');
    });

    expect(() =>
      service.publishReservation(REALTIME_EVENTS.RESERVATION_CREATED, reservation, { availabilityChanged: true }),
    ).not.toThrow();
  });

  it('disconnects every socket of a user', () => {
    service.disconnectUser(actors.employeeA.id);

    expect(server.in).toHaveBeenCalledWith(`user:${actors.employeeA.id}`);
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });
});

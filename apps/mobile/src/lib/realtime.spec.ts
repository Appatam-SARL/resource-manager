import { describe, expect, it } from 'vitest';
import type { RealtimeMessage } from '@resource-manager/types';
import {
  REALTIME_EVENT_NAMES,
  getRealtimeErrorCode,
  getRealtimeInvalidations,
  getRealtimeUrl,
} from './realtime';

const reservationData = {
  reservationId: 'res-1',
  companyId: 'company-a',
  directionId: null,
  userId: 'user-1',
  resourceType: 'ROOM' as const,
  resourceId: 'room-1',
  status: 'APPROVED' as const,
  startAt: '2026-10-01T08:00:00.000Z',
  endAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-09-30T12:00:00.000Z',
};

function envelope<T extends RealtimeMessage>(message: Omit<T, 'eventId' | 'timestamp'>): T {
  return { eventId: 'evt-1', timestamp: '2026-09-30T12:00:00.000Z', ...message } as T;
}

describe('realtime (mobile)', () => {
  it('listens to every event of the API contract', () => {
    expect(REALTIME_EVENT_NAMES).toHaveLength(11);
  });

  it('builds the namespace URL from the API base URL', () => {
    expect(getRealtimeUrl('http://192.168.1.10:3000')).toBe('http://192.168.1.10:3000/realtime');
  });

  it('reads the structured connection error code only', () => {
    expect(getRealtimeErrorCode({ data: { code: 'UNAUTHORIZED', message: 'Authentification requise.' } })).toBe(
      'UNAUTHORIZED',
    );
    expect(getRealtimeErrorCode(new Error('websocket error'))).toBeNull();
    expect(getRealtimeErrorCode(null)).toBeNull();
  });

  it('refreshes my reservations, calendar, home and slot availability on reservation events', () => {
    expect(getRealtimeInvalidations(envelope({ type: 'reservation.approved', data: reservationData }))).toEqual([
      ['reservations'],
      ['calendar'],
      ['dashboard'],
      ['availability'],
    ]);
  });

  it("only refreshes slot availability when a colleague's booking changed", () => {
    const data = {
      resourceType: 'VEHICLE' as const,
      resourceId: 'vehicle-1',
      companyId: 'company-a',
      resourceStatus: 'AVAILABLE' as const,
      changedAt: '2026-09-30T12:00:00.000Z',
    };
    expect(
      getRealtimeInvalidations(
        envelope({ type: 'resource.availability.changed', data: { ...data, reason: 'RESERVATION_CHANGED' } }),
      ),
    ).toEqual([['availability']]);
    expect(
      getRealtimeInvalidations(
        envelope({ type: 'resource.availability.changed', data: { ...data, reason: 'STATUS_CHANGED' } }),
      ),
    ).toEqual([['availability'], ['vehicles'], ['dashboard']]);
  });

  it('refreshes rooms on resource CRUD events', () => {
    expect(
      getRealtimeInvalidations(
        envelope({
          type: 'resource.updated',
          data: {
            resourceType: 'ROOM',
            resourceId: 'room-1',
            companyId: 'company-a',
            status: 'AVAILABLE',
            updatedAt: '2026-09-30T12:00:00.000Z',
          },
        }),
      ),
    ).toEqual([['rooms'], ['availability'], ['dashboard']]);
  });

  it('refreshes notifications on notification.created', () => {
    expect(
      getRealtimeInvalidations(
        envelope({
          type: 'notification.created',
          data: {
            notificationId: 'n-1',
            type: 'RESERVATION_APPROVED',
            title: 'Réservation approuvée',
            body: '…',
            entityType: 'Reservation',
            entityId: 'res-1',
            createdAt: '2026-09-30T12:00:00.000Z',
          },
        }),
      ),
    ).toEqual([['notifications']]);
  });
});

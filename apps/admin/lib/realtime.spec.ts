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
  resourceType: 'VEHICLE' as const,
  resourceId: 'vehicle-1',
  status: 'PENDING' as const,
  startAt: '2026-10-01T08:00:00.000Z',
  endAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-09-30T12:00:00.000Z',
};

function envelope<T extends RealtimeMessage>(message: Omit<T, 'eventId' | 'timestamp'>): T {
  return { eventId: 'evt-1', timestamp: '2026-09-30T12:00:00.000Z', ...message } as T;
}

describe('realtime (admin)', () => {
  it('listens to every event of the API contract', () => {
    expect(REALTIME_EVENT_NAMES).toHaveLength(11);
    expect(REALTIME_EVENT_NAMES).toContain('resource.availability.changed');
  });

  it('builds the namespace URL from the API base URL', () => {
    expect(getRealtimeUrl('http://localhost:3000/')).toBe('http://localhost:3000/realtime');
    expect(getRealtimeUrl('')).toBe('/realtime');
  });

  it('reads the structured connection error code only', () => {
    expect(getRealtimeErrorCode({ message: 'x', data: { code: 'UNAUTHORIZED' } })).toBe('UNAUTHORIZED');
    expect(getRealtimeErrorCode({ data: { code: 'TOO_MANY_CONNECTIONS' } })).toBe('TOO_MANY_CONNECTIONS');
    expect(getRealtimeErrorCode(new Error('xhr poll error'))).toBeNull();
    expect(getRealtimeErrorCode({ data: { code: 'OTHER' } })).toBeNull();
  });

  it('refreshes reservation lists, calendar and dashboard on reservation events', () => {
    for (const type of ['reservation.created', 'reservation.approved', 'reservation.cancelled'] as const) {
      expect(getRealtimeInvalidations(envelope({ type, data: reservationData }))).toEqual([
        ['reservations'],
        ['calendar'],
        ['dashboard'],
      ]);
    }
  });

  it('refreshes the resource list only when its status changed', () => {
    const data = {
      resourceType: 'ROOM' as const,
      resourceId: 'room-1',
      companyId: 'company-a',
      resourceStatus: 'MAINTENANCE' as const,
      changedAt: '2026-09-30T12:00:00.000Z',
    };
    expect(
      getRealtimeInvalidations(
        envelope({ type: 'resource.availability.changed', data: { ...data, reason: 'STATUS_CHANGED' } }),
      ),
    ).toEqual([['rooms'], ['dashboard']]);
    expect(
      getRealtimeInvalidations(
        envelope({ type: 'resource.availability.changed', data: { ...data, reason: 'RESERVATION_CHANGED' } }),
      ),
    ).toEqual([['dashboard']]);
  });

  it('refreshes vehicles on resource CRUD events', () => {
    expect(
      getRealtimeInvalidations(
        envelope({
          type: 'resource.deleted',
          data: { resourceType: 'VEHICLE', resourceId: 'vehicle-1', companyId: 'company-a' },
        }),
      ),
    ).toEqual([['vehicles'], ['dashboard']]);
  });

  it('refreshes notifications (list and unread counter) on notification.created', () => {
    expect(
      getRealtimeInvalidations(
        envelope({
          type: 'notification.created',
          data: {
            notificationId: 'n-1',
            type: 'RESERVATION_CREATED',
            title: 'Nouvelle demande',
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

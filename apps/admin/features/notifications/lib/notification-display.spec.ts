import type { Notification } from '@resource-manager/types';
import { describe, expect, it } from 'vitest';
import {
  getNotificationTypeConfig,
  groupNotificationsByDay,
  notificationHref,
} from './notification-display';

function notification(id: string, createdAt: Date): Notification {
  return {
    id,
    userId: 'u1',
    type: 'RESERVATION_APPROVED',
    title: 'Réservation approuvée',
    body: '',
    entityType: 'Reservation',
    entityId: `r-${id}`,
    readAt: null,
    createdAt: createdAt.toISOString(),
  };
}

describe('groupNotificationsByDay', () => {
  const now = new Date(2026, 8, 29, 15, 0);

  it('labels today, yesterday and older days in API order', () => {
    const groups = groupNotificationsByDay(
      [
        notification('a', new Date(2026, 8, 29, 10, 0)),
        notification('b', new Date(2026, 8, 29, 8, 0)),
        notification('c', new Date(2026, 8, 28, 18, 0)),
        notification('d', new Date(2026, 8, 24, 9, 0)),
        notification('e', new Date(2025, 11, 31, 9, 0)),
      ],
      now,
    );
    expect(groups.map((group) => group.label)).toEqual([
      'Aujourd’hui',
      'Hier',
      'Jeudi 24 septembre',
      'Mercredi 31 décembre 2025',
    ]);
    expect(groups[0].items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('returns no group for an empty list', () => {
    expect(groupNotificationsByDay([], now)).toEqual([]);
  });
});

describe('notificationHref', () => {
  it('links reservation notifications to their detail page', () => {
    expect(notificationHref({ entityType: 'Reservation', entityId: 'r1' })).toBe('/reservations/r1');
  });

  it('gives no link without a known entity', () => {
    expect(notificationHref({ entityType: null, entityId: null })).toBeNull();
    expect(notificationHref({ entityType: 'Other', entityId: 'x' })).toBeNull();
  });
});

describe('getNotificationTypeConfig', () => {
  it('maps known types and falls back for unknown ones', () => {
    expect(getNotificationTypeConfig('RESERVATION_REJECTED').tone).toBe('danger');
    expect(getNotificationTypeConfig('SOMETHING_ELSE').label).toBe('Notification');
  });
});

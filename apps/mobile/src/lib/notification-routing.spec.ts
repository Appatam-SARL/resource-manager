import { describe, expect, it } from 'vitest';
import type { Notification } from '@resource-manager/types';
import {
  NOTIFICATIONS_ROUTE,
  getNotificationRoute,
  parseNotificationData,
  toNotificationData,
} from './notification-routing';

describe('parseNotificationData', () => {
  it('extrait uniquement les champs attendus', () => {
    expect(
      parseNotificationData({
        type: 'RESERVATION_APPROVED',
        notificationId: 'n-1',
        reservationId: 'res-1',
        email: 'ne-doit-pas-passer@appatam.dev',
      }),
    ).toEqual({
      type: 'RESERVATION_APPROVED',
      notificationId: 'n-1',
      reservationId: 'res-1',
    });
  });

  it('tolère un payload absent ou mal formé', () => {
    expect(parseNotificationData(undefined)).toEqual({});
    expect(parseNotificationData('texte')).toEqual({});
    expect(parseNotificationData({ reservationId: 42 })).toEqual({
      type: undefined,
      notificationId: undefined,
      reservationId: undefined,
    });
  });
});

describe('getNotificationRoute', () => {
  it.each([
    'RESERVATION_CREATED',
    'RESERVATION_APPROVED',
    'RESERVATION_REJECTED',
    'RESERVATION_CANCELLED',
    'RESERVATION_EXTENDED',
  ])('ouvre la réservation pour %s', (type) => {
    expect(getNotificationRoute({ type, reservationId: 'cmg123abc' })).toBe(
      '/(app)/reservations/cmg123abc',
    );
  });

  it('ouvre la liste pour un type inconnu', () => {
    expect(
      getNotificationRoute({ type: 'SOMETHING_NEW', reservationId: 'res-1' }),
    ).toBe(NOTIFICATIONS_ROUTE);
  });

  it('ouvre la liste quand reservationId est absent', () => {
    expect(getNotificationRoute({ type: 'RESERVATION_APPROVED' })).toBe(
      NOTIFICATIONS_ROUTE,
    );
  });

  it('refuse un identifiant qui pourrait détourner la navigation', () => {
    expect(
      getNotificationRoute({
        type: 'RESERVATION_APPROVED',
        reservationId: '../profile',
      }),
    ).toBe(NOTIFICATIONS_ROUTE);
  });
});

describe('toNotificationData', () => {
  const base: Notification = {
    id: 'n-1',
    userId: 'u-1',
    type: 'RESERVATION_REJECTED',
    title: 'Réservation rejetée',
    body: 'Votre réservation a été rejetée.',
    entityType: 'Reservation',
    entityId: 'res-9',
    readAt: null,
    createdAt: '2026-09-28T10:00:00.000Z',
  };

  it('convertit une notification persistée vers le même payload que le push', () => {
    expect(toNotificationData(base)).toEqual({
      type: 'RESERVATION_REJECTED',
      notificationId: 'n-1',
      reservationId: 'res-9',
    });
  });

  it("n'expose pas d'identifiant d'une autre entité", () => {
    expect(
      toNotificationData({ ...base, entityType: 'Other', entityId: 'x' })
        .reservationId,
    ).toBeUndefined();
  });
});

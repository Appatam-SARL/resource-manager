import type { Notification } from '@resource-manager/types';
import {
  RESERVATION_NOTIFICATION_TYPES,
  type PushNotificationData,
  type ReservationNotificationType,
} from '@/types/notification';

export const NOTIFICATIONS_ROUTE = '/(app)/notifications' as const;

export type NotificationRoute =
  | typeof NOTIFICATIONS_ROUTE
  | `/(app)/reservations/${string}`;

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** Push payloads come from outside the app: never trust their shape. */
export function parseNotificationData(raw: unknown): PushNotificationData {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  return {
    type: readString(record.type),
    notificationId: readString(record.notificationId),
    reservationId: readString(record.reservationId),
  };
}

export function isReservationNotificationType(
  type: string | undefined,
): type is ReservationNotificationType {
  return (RESERVATION_NOTIFICATION_TYPES as readonly string[]).includes(
    type ?? '',
  );
}

/**
 * Single source of truth for "where does this notification lead".
 * Unknown types or missing ids fall back to the notifications list.
 */
export function getNotificationRoute(
  data: PushNotificationData,
): NotificationRoute {
  if (
    isReservationNotificationType(data.type) &&
    data.reservationId &&
    /^[\w-]+$/.test(data.reservationId)
  ) {
    return `/(app)/reservations/${data.reservationId}`;
  }
  return NOTIFICATIONS_ROUTE;
}

/** Maps a persisted notification (GET /notifications) to the same payload shape. */
export function toNotificationData(notification: Notification): PushNotificationData {
  return {
    type: notification.type,
    notificationId: notification.id,
    reservationId:
      notification.entityType === 'Reservation' && notification.entityId
        ? notification.entityId
        : undefined,
  };
}

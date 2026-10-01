export const REALTIME_NAMESPACE = '/realtime';

/** Server → client event names. Clients must rely on these exact strings. */
export const REALTIME_EVENTS = {
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_UPDATED: 'reservation.updated',
  RESERVATION_APPROVED: 'reservation.approved',
  RESERVATION_REJECTED: 'reservation.rejected',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_EXTENDED: 'reservation.extended',
  RESOURCE_CREATED: 'resource.created',
  RESOURCE_UPDATED: 'resource.updated',
  RESOURCE_DELETED: 'resource.deleted',
  RESOURCE_AVAILABILITY_CHANGED: 'resource.availability.changed',
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type ReservationEventName =
  | typeof REALTIME_EVENTS.RESERVATION_CREATED
  | typeof REALTIME_EVENTS.RESERVATION_UPDATED
  | typeof REALTIME_EVENTS.RESERVATION_APPROVED
  | typeof REALTIME_EVENTS.RESERVATION_REJECTED
  | typeof REALTIME_EVENTS.RESERVATION_CANCELLED
  | typeof REALTIME_EVENTS.RESERVATION_EXTENDED;

/** Error codes sent in `connect_error.data.code`. */
export const REALTIME_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOO_MANY_CONNECTIONS: 'TOO_MANY_CONNECTIONS',
} as const;

export type RealtimeErrorCode =
  (typeof REALTIME_ERROR_CODES)[keyof typeof REALTIME_ERROR_CODES];

/** Simultaneous sockets per user (phone + tablet + a few admin tabs). */
export const REALTIME_MAX_CONNECTIONS_PER_USER = 5;

/** Clients never send business payloads: a small frame limit is enough. */
export const REALTIME_MAX_PAYLOAD_BYTES = 16 * 1024;

/** setTimeout cannot schedule beyond 2^31 - 1 ms. */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

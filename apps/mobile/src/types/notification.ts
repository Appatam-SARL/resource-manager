export const RESERVATION_NOTIFICATION_TYPES = [
  'RESERVATION_CREATED',
  'RESERVATION_APPROVED',
  'RESERVATION_REJECTED',
  'RESERVATION_CANCELLED',
  'RESERVATION_EXTENDED',
] as const;

export type ReservationNotificationType =
  (typeof RESERVATION_NOTIFICATION_TYPES)[number];

/** Minimal payload sent by the API with each push (no sensitive data). */
export type PushNotificationData = {
  type?: string;
  notificationId?: string;
  reservationId?: string;
};

export type PushPermissionStatus =
  | 'granted'
  | 'provisional'
  | 'denied'
  | 'undetermined'
  /** Expo Go, simulator, web or missing EAS projectId. */
  | 'unavailable';

export type RegisterPushTokenPayload = {
  token: string;
  platform: 'ANDROID' | 'IOS';
  deviceName?: string;
};

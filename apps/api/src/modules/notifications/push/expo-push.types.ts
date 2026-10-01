/** Android channels declared by the mobile app (see apps/mobile/src/lib/notifications.ts). */
export type PushChannelId = 'reservation' | 'general';

/** Minimal, non-sensitive payload used by the mobile app for navigation. */
export type PushNotificationData = {
  type: string;
  notificationId: string;
  reservationId?: string;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: PushNotificationData;
  sound: 'default' | null;
  channelId: PushChannelId;
  priority: 'default' | 'normal' | 'high';
};

export type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | {
      status: 'error';
      message: string;
      /** e.g. DeviceNotRegistered, InvalidCredentials, MessageTooBig, MessageRateExceeded */
      details?: { error?: string };
    };

export type ExpoPushResult = {
  token: string;
  ticket: ExpoPushTicket;
};

export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';
import { notificationsApi } from '@/api/client';
import {
  getNotificationRoute,
  parseNotificationData,
} from '@/lib/notification-routing';
import type {
  PushNotificationData,
  PushPermissionStatus,
} from '@/types/notification';

type NotificationsModule = typeof import('expo-notifications');
type NotificationResponse = import('expo-notifications').NotificationResponse;

/** Last token registered by this device — SecureStore only (never AsyncStorage). */
const PUSH_TOKEN_KEY = 'rm_mobile_push_token';
const UNREGISTER_TIMEOUT_MS = 5_000;

export const ANDROID_CHANNELS = {
  reservation: 'reservation',
  general: 'general',
} as const;

let modulePromise: Promise<NotificationsModule | null> | null = null;
let handlingConfigured = false;
let registeredKey: string | null = null;
const handledResponseIds = new Set<string>();

function debugLog(message: string) {
  if (__DEV__) {
    console.info(`[notifications] ${message}`);
  }
}

function getProjectId(): string | undefined {
  const fromEas = Constants.easConfig?.projectId;
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return fromEas ?? extra?.eas?.projectId;
}

/**
 * Remote push needs a real build (development/preview/production):
 * Expo Go removed Android push in SDK 53 and warns on import.
 */
export function isPushSupported(): boolean {
  return Platform.OS !== 'web' && !isRunningInExpoGo();
}

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (!isPushSupported()) return null;
  modulePromise ??= import('expo-notifications').catch(() => null);
  return modulePromise;
}

/** Foreground presentation + Android channels. Safe to call several times. */
export async function configureNotificationHandling(): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications || handlingConfigured) return;
  handlingConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.reservation, {
        name: 'Réservations',
        description: 'Création, approbation, rejet et annulation de vos réservations.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#1B4332',
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.general, {
        name: 'Général',
        description: 'Informations générales de Resource Manager.',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      }),
    ]);
  }
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return 'unavailable';
  const settings = await Notifications.getPermissionsAsync();
  return toPermissionStatus(Notifications, settings);
}

function toPermissionStatus(
  Notifications: NotificationsModule,
  settings: Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>,
): PushPermissionStatus {
  if (
    Platform.OS === 'ios' &&
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'provisional';
  }
  if (settings.granted) return 'granted';
  if (settings.status === 'denied') return 'denied';
  return 'undetermined';
}

/** Asks the OS only while the status is undetermined: never nags after a refusal. */
export async function ensurePushPermission(): Promise<PushPermissionStatus> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return 'unavailable';

  const current = await Notifications.getPermissionsAsync();
  const status = toPermissionStatus(Notifications, current);
  if (status !== 'undetermined' || !current.canAskAgain) {
    return status;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return toPermissionStatus(Notifications, requested);
}

async function getExpoPushToken(
  Notifications: NotificationsModule,
): Promise<string | null> {
  if (!Device.isDevice) {
    debugLog('Push token skipped: physical device required');
    return null;
  }
  const projectId = getProjectId();
  if (!projectId) {
    debugLog('Push token skipped: EAS projectId missing (run `eas init`)');
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * Permission → Expo token → POST /notifications/push-tokens.
 * The API binds the token to the JWT user; no userId is ever sent.
 * Never throws: push is optional, the app must keep working without it.
 */
export async function registerDevicePushToken(userId: string): Promise<void> {
  try {
    const Notifications = await loadNotificationsModule();
    if (!Notifications) return;

    const permission = await ensurePushPermission();
    if (permission !== 'granted' && permission !== 'provisional') {
      debugLog(`Push registration skipped (permission: ${permission})`);
      return;
    }

    const token = await getExpoPushToken(Notifications);
    if (!token) return;

    const key = `${userId}:${token}`;
    if (registeredKey === key) return;

    await notificationsApi.registerPushToken({
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      deviceName: Device.deviceName ?? Device.modelName ?? undefined,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    registeredKey = key;
    debugLog('Push notification registration completed');
  } catch {
    debugLog('Push notification registration failed');
  }
}

/** Best effort on logout: a failure here must never block the logout. */
export async function unregisterDevicePushToken(): Promise<void> {
  registeredKey = null;
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  } catch {
    return;
  }
  if (!token) return;

  try {
    await notificationsApi.unregisterPushToken(token, UNREGISTER_TIMEOUT_MS);
    debugLog('Push token deactivated');
  } catch {
    debugLog('Push token deactivation failed (ignored)');
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);
  }
}

export type NotificationListeners = {
  onReceived: (data: PushNotificationData) => void;
  onResponse: (response: NotificationResponse) => void;
};

/** Registers foreground + tap listeners once; returns the cleanup function. */
export async function addNotificationListeners(
  listeners: NotificationListeners,
): Promise<() => void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return () => undefined;

  const received = Notifications.addNotificationReceivedListener((notification) => {
    listeners.onReceived(parseNotificationData(notification.request.content.data));
  });
  const response = Notifications.addNotificationResponseReceivedListener(
    listeners.onResponse,
  );
  return () => {
    received.remove();
    response.remove();
  };
}

/** Tap that launched the app from a killed state (cold start). */
export async function getInitialNotificationResponse(): Promise<NotificationResponse | null> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;
  return Notifications.getLastNotificationResponseAsync();
}

/** Returns false when this tap was already handled (listener + cold start overlap). */
export function claimNotificationResponse(response: NotificationResponse): boolean {
  const id = response.notification.request.identifier;
  if (handledResponseIds.has(id)) return false;
  handledResponseIds.add(id);
  return true;
}

export function getResponseData(response: NotificationResponse): PushNotificationData {
  return parseNotificationData(response.notification.request.content.data);
}

/**
 * Central navigation for notification taps (push or in-app list).
 * Marks the persisted notification as read, then opens the related screen.
 */
export async function handleNotificationNavigation(
  data: PushNotificationData,
  options: { onMarkedRead?: () => void } = {},
): Promise<void> {
  if (data.notificationId) {
    notificationsApi
      .markRead(data.notificationId)
      .then(() => options.onMarkedRead?.())
      .catch(() => undefined);
  }
  router.push(getNotificationRoute(data));
}

export async function setAppBadgeCount(count: number): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => false);
}

export function openNotificationSettings(): void {
  void Linking.openSettings();
}

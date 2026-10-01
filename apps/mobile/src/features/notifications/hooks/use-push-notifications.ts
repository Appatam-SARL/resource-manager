import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  addNotificationListeners,
  claimNotificationResponse,
  configureNotificationHandling,
  getInitialNotificationResponse,
  getResponseData,
  handleNotificationNavigation,
  registerDevicePushToken,
  setAppBadgeCount,
} from '@/lib/notifications';
import {
  invalidateNotifications,
  notificationKeys,
  useUnreadNotificationsCount,
} from '@/features/notifications/hooks/use-notifications';

/**
 * Wires push notifications for an authenticated session.
 * Must be mounted under the authenticated layout, so the session is resolved
 * and the router is mounted before any navigation (cold start included).
 */
export function usePushNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const unreadQuery = useUnreadNotificationsCount(Boolean(userId));

  useEffect(() => {
    if (!userId || !navigationReady) return;

    let cancelled = false;
    let removeListeners: () => void = () => undefined;

    const openFromResponse = (
      response: Parameters<typeof getResponseData>[0],
    ) => {
      if (!claimNotificationResponse(response)) return;
      void handleNotificationNavigation(getResponseData(response), {
        onMarkedRead: () => void invalidateNotifications(queryClient),
      });
    };

    async function setup() {
      await configureNotificationHandling();
      const cleanup = await addNotificationListeners({
        onReceived: () => void invalidateNotifications(queryClient),
        onResponse: openFromResponse,
      });
      if (cancelled) {
        cleanup();
        return;
      }
      removeListeners = cleanup;

      const initialResponse = await getInitialNotificationResponse();
      if (!cancelled && initialResponse) {
        openFromResponse(initialResponse);
      }

      await registerDevicePushToken(userId!);
      if (!cancelled) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.permission });
      }
    }

    void setup();
    return () => {
      cancelled = true;
      removeListeners();
    };
  }, [userId, navigationReady, queryClient]);

  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void invalidateNotifications(queryClient);
        void queryClient.invalidateQueries({ queryKey: notificationKeys.permission });
      }
    });
    return () => subscription.remove();
  }, [userId, queryClient]);

  const unread = unreadQuery.data;
  useEffect(() => {
    if (unread !== undefined) {
      void setAppBadgeCount(unread);
    }
  }, [unread]);
}

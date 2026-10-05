'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import type { RealtimeMessage } from '@resource-manager/types';
import { notificationHref } from '@/features/notifications/lib/notification-display';
import { getApiBaseUrl, getStoredAccessToken, refreshSession } from '@/lib/api';
import {
  REALTIME_EVENT_NAMES,
  getRealtimeErrorCode,
  getRealtimeInvalidations,
  getRealtimeUrl,
} from '@/lib/realtime';
import { useAuth } from '@/providers/auth-provider';

/** One user action emits several events (reservation, availability, notification). */
const INVALIDATION_BATCH_MS = 150;

/**
 * Keeps the admin cache in sync with the API through the `/realtime` namespace.
 * Mounted once in the authenticated layout; disconnects on logout.
 */
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const socket = io(getRealtimeUrl(getApiBaseUrl()), {
      transports: ['websocket'],
      auth: (cb) => cb({ token: getStoredAccessToken() ?? '' }),
    });

    const pendingKeys = new Map<string, QueryKey>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let hasConnected = false;
    let recoveringSession = false;

    const scheduleInvalidation = (keys: QueryKey[]) => {
      for (const key of keys) pendingKeys.set(JSON.stringify(key), key);
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = undefined;
        for (const key of pendingKeys.values()) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
        pendingKeys.clear();
      }, INVALIDATION_BATCH_MS);
    };

    // Expired token, deactivated account or changed role: refresh once, then reconnect.
    // If the refresh fails, the next REST call redirects to the login page.
    const recoverSession = async () => {
      if (recoveringSession) return;
      recoveringSession = true;
      const tokens = await refreshSession();
      if (!tokens) return;
      await refreshUser().catch(() => undefined);
      socket.connect();
    };

    socket.on('connect', () => {
      recoveringSession = false;
      // Events are not replayed: anything missed while offline is reloaded through REST.
      if (hasConnected) void queryClient.invalidateQueries();
      hasConnected = true;
    });

    socket.on('connect_error', (error) => {
      if (getRealtimeErrorCode(error) === 'UNAUTHORIZED') void recoverSession();
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') void recoverSession();
    });

    for (const eventName of REALTIME_EVENT_NAMES) {
      socket.on(eventName, (message: RealtimeMessage) => {
        scheduleInvalidation(getRealtimeInvalidations(message));
        if (message.type === 'notification.created') {
          const href = notificationHref(message.data);
          toast(message.data.title, {
            description: message.data.body,
            action: href ? { label: 'Voir', onClick: () => router.push(href) } : undefined,
          });
        }
      });
    }

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, queryClient, router, refreshUser]);
}

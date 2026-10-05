import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { RealtimeMessage } from '@resource-manager/types';
import { getBaseUrl, refreshAccessToken } from '@/api/client';
import { useAuth } from '@/features/auth/auth-provider';
import { getAccessToken } from '@/lib/auth-storage';
import {
  REALTIME_EVENT_NAMES,
  getRealtimeErrorCode,
  getRealtimeInvalidations,
  getRealtimeUrl,
} from '@/lib/realtime';

/** One user action emits several events (reservation, availability, notification). */
const INVALIDATION_BATCH_MS = 150;

/**
 * Keeps the mobile cache in sync with the API through the `/realtime` namespace.
 * The socket is closed in background and reopened (with a REST resync) when the app
 * becomes active again.
 */
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const socket = io(getRealtimeUrl(getBaseUrl()), {
      transports: ['websocket'],
      auth: (cb) => {
        void getAccessToken().then((token) => cb({ token: token ?? '' }));
      },
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
    // A failed refresh already signs the user out (see refreshAccessToken).
    const recoverSession = async () => {
      if (recoveringSession) return;
      recoveringSession = true;
      const token = await refreshAccessToken();
      if (!token) return;
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
      });
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!socket.connected) socket.connect();
      } else if (state === 'background') {
        socket.disconnect();
      }
    });

    return () => {
      appStateSubscription.remove();
      if (flushTimer) clearTimeout(flushTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, queryClient, refreshUser]);
}

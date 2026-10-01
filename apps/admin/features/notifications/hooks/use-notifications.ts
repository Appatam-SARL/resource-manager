'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useNotifications(page = 1, limit = 20) {
  const params: ListQueryParams = { page, limit };
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getNotifications(params)),
  });
}

/** Real unread total from the API (not limited to the loaded page). */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () =>
      (await apiCallWithRefresh((client) => client.getUnreadNotificationsCount())).count,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Silent: reading a notification is an implicit action, no toast on success. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCallWithRefresh((client) => client.markNotificationRead(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de marquer la notification',
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCallWithRefresh((client) => client.markAllNotificationsRead()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications ont été marquées comme lues');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de tout marquer comme lu',
      );
    },
  });
}

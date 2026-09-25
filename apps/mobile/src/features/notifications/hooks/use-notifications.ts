import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { notificationsApi } from '@/api/client';

export function useNotifications(params?: ListQueryParams) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params),
  });
}

export function useUnreadNotificationsCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    enabled,
    queryFn: async () => {
      const result = await notificationsApi.list({ page: 1, limit: 50 });
      return result.data.filter((n) => !n.readAt).length;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { notificationsApi } from '@/api/client';
import { getPushPermissionStatus } from '@/lib/notifications';

const PAGE_SIZE = 20;
const UNREAD_REFRESH_INTERVAL_MS = 60_000;

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  permission: ['push-permission'] as const,
};

/** Refreshes only the notification list and the unread counter. */
export function invalidateNotifications(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      notificationsApi.list({ page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
  });
}

export function useUnreadNotificationsCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    enabled,
    queryFn: async () => (await notificationsApi.unreadCount()).count,
    refetchInterval: UNREAD_REFRESH_INTERVAL_MS,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    retry: 0,
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    retry: 0,
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function usePushPermissionStatus() {
  return useQuery({
    queryKey: notificationKeys.permission,
    queryFn: getPushPermissionStatus,
    staleTime: 0,
  });
}

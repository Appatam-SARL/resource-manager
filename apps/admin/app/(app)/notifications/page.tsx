'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '@resource-manager/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from '@/features/notifications';
import {
  NotificationList,
  NotificationListSkeleton,
} from '@/features/notifications/components/notification-list';
import { notificationHref } from '@/features/notifications/lib/notification-display';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = useNotifications(page, PAGE_SIZE);
  const unreadCountQuery = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = query.data?.data ?? [];
  const meta = query.data?.meta;
  const unreadCount = unreadCountQuery.data ?? 0;

  const markAsRead = (notification: Notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
  };

  const openNotification = (notification: Notification) => {
    markAsRead(notification);
    const href = notificationHref(notification);
    if (href) router.push(href);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Événements liés aux réservations de votre périmètre."
        meta={
          unreadCountQuery.data !== undefined ? (
            <span className="tabular-nums">
              {unreadCount === 0
                ? 'Tout est lu'
                : `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`}
            </span>
          ) : null
        }
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="size-4" aria-hidden />
              Tout marquer comme lu
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <NotificationListSkeleton />
      ) : query.isError ? (
        <ErrorState
          title="Impossible de charger les notifications"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez notifié ici des demandes, approbations, refus et annulations de réservation."
        />
      ) : (
        <>
          <NotificationList
            notifications={notifications}
            onOpen={openNotification}
            onMarkRead={markAsRead}
            markingId={markRead.isPending ? (markRead.variables ?? null) : null}
          />
          {meta && meta.totalPages > 1 ? (
            <PaginationControls
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

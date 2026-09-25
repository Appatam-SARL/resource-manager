'use client';

import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import type { Notification } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { Button } from '@/components/ui/button';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications';
import { formatDateTime } from '@/lib/format';
import { cn } from 'cn';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const query = useNotifications(page, 20);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications: Notification[] = query.data?.data ?? [];
  const hasUnread = notifications.some(
    (item: Notification) => !item.readAt,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Suivez les événements liés à vos réservations et à votre périmètre."
        actions={
          hasUnread ? (
            <Button
              type="button"
              variant="outline"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="size-4" />
              Tout marquer comme lu
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <LoadingState label="Chargement des notifications…" />
      ) : query.isError ? (
        <ErrorState
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous n’avez pas encore de notification."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {notifications.map((notification: Notification) => {
              const unread = !notification.readAt;
              return (
                <li
                  key={notification.id}
                  className={cn(
                    'rounded-3xl bg-card p-4 ring-1 transition-colors',
                    unread
                      ? 'ring-primary/30 bg-secondary/40'
                      : 'ring-border/60',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {unread ? (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                        <p className="font-medium text-foreground">
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {unread ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        Marquer comme lu
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Lue</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {query.data ? (
            <PaginationControls
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              total={query.data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

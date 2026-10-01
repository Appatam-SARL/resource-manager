'use client';

import type { Notification } from '@resource-manager/types';
import { format } from 'date-fns';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getNotificationTypeConfig,
  groupNotificationsByDay,
  notificationHref,
} from '@/features/notifications/lib/notification-display';
import { STATUS_TONE_CLASSES } from '@/lib/status';
import { cn } from 'cn';

type NotificationListProps = {
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  markingId: string | null;
};

function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  marking,
}: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
  marking: boolean;
}) {
  const unread = !notification.readAt;
  const config = getNotificationTypeConfig(notification.type);
  const Icon = config.icon;
  const href = notificationHref(notification);

  return (
    <li className={cn('relative flex items-start gap-1 pr-2', unread && 'bg-secondary/40')}>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pl-4 text-left transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      >
        <span
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
            STATUS_TONE_CLASSES[config.tone].badge,
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="flex items-center gap-2">
            {unread ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" /> : null}
            <span className={cn('truncate text-sm text-foreground', unread ? 'font-semibold' : 'font-medium')}>
              {notification.title}
            </span>
          </span>
          {notification.body ? (
            <span className="line-clamp-2 block text-sm text-muted-foreground">{notification.body}</span>
          ) : null}
          <span className="block text-xs text-muted-foreground">
            {config.label} · {format(new Date(notification.createdAt), 'HH:mm')}
          </span>
        </span>
        {href ? <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
      </button>
      <div className="flex w-9 shrink-0 justify-center pt-3.5">
        {unread ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onMarkRead}
                  disabled={marking}
                  aria-label="Marquer comme lue"
                />
              }
            >
              <Check className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="left">Marquer comme lue</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </li>
  );
}

export function NotificationList({ notifications, onOpen, onMarkRead, markingId }: NotificationListProps) {
  const groups = groupNotificationsByDay(notifications);
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`notifications-${group.key}`} className="space-y-2">
          <h2 id={`notifications-${group.key}`} className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-border">
            {group.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={() => onOpen(notification)}
                onMarkRead={() => onMarkRead(notification)}
                marking={markingId === notification.id}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function NotificationListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Chargement des notifications">
      <Skeleton className="h-3 w-24" />
      <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-border">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

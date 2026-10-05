'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import type { CalendarEvent } from '@resource-manager/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Panel } from '@/components/shared/panel';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEventTimeRange, isEventInProgress } from '@/features/dashboard/lib/dashboard';
import { RESOURCE_TYPE_LABELS } from '@/lib/format';
import { cn } from 'cn';

type DashboardTodayProps = {
  events: CalendarEvent[] | undefined;
  now: Date;
  isError: boolean;
  onRetry: () => void;
};

const VISIBLE_EVENTS = 6;

export function DashboardToday({ events, now, isError, onRetry }: DashboardTodayProps) {
  let content;
  if (isError) {
    content = <ErrorState size="compact" message="Impossible de charger le planning du jour." onRetry={onRetry} />;
  } else if (!events) {
    content = (
      <div className="space-y-4 px-5 py-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    );
  } else if (events.length === 0) {
    content = (
      <EmptyState
        size="compact"
        icon={CalendarDays}
        title="Aucune réservation aujourd’hui"
        description="Les créneaux réservés de la journée apparaîtront ici."
      />
    );
  } else {
    const hidden = events.length - VISIBLE_EVENTS;
    content = (
      <ol className="px-2">
        {events.slice(0, VISIBLE_EVENTS).map((event) => {
          const inProgress = isEventInProgress(event, now);
          return (
            <li key={event.id}>
              <Link
                href={`/reservations/${event.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="w-[88px] shrink-0">
                  <p className={cn('text-[13px] font-medium tabular-nums', inProgress ? 'text-primary' : 'text-foreground')}>
                    {formatEventTimeRange(event, now)}
                  </p>
                  {inProgress ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                      <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
                      En cours
                    </p>
                  ) : null}
                </div>
                <ResourceTypeIcon resourceType={event.resourceType} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {event.resourceName ?? RESOURCE_TYPE_LABELS[event.resourceType]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[event.requesterName, event.context].filter(Boolean).join(' · ') || event.title}
                  </p>
                </div>
                <StatusBadge status={event.status} className="hidden sm:inline-flex" />
              </Link>
            </li>
          );
        })}
        {hidden > 0 ? (
          <li className="px-3 pt-1 text-xs text-muted-foreground">
            + {hidden} autre{hidden > 1 ? 's' : ''} réservation{hidden > 1 ? 's' : ''}
          </li>
        ) : null}
      </ol>
    );
  }

  return (
    <Panel
      title="Aujourd’hui"
      description="Planning de la journée dans votre périmètre"
      flush
      action={
        <Link href="/calendar" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}>
          Calendrier
        </Link>
      }
    >
      {content}
    </Panel>
  );
}

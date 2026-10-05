'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { Reservation } from '@resource-manager/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, reservationResourceLabel, userDisplayName } from '@/lib/format';

type ReservationMiniListProps = {
  reservations: Reservation[] | undefined;
  isError: boolean;
  onRetry: () => void;
  empty: { icon: LucideIcon; title: string; description: string };
  /** Optional trailing element per row (e.g. "Examiner"). */
  trailing?: (reservation: Reservation) => ReactNode;
  skeletonRows?: number;
};

/** Compact reservation list for panels (dashboard, resource detail…), with its own loading / error / empty states. */
export function ReservationMiniList({
  reservations,
  isError,
  onRetry,
  empty,
  trailing,
  skeletonRows = 4,
}: ReservationMiniListProps) {
  if (isError) {
    return <ErrorState size="compact" message="Impossible de charger les réservations." onRetry={onRetry} />;
  }
  if (!reservations) {
    return (
      <div className="space-y-4 px-5 py-2">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  if (reservations.length === 0) {
    return <EmptyState size="compact" icon={empty.icon} title={empty.title} description={empty.description} />;
  }

  return (
    <ul className="px-2">
      {reservations.map((reservation) => (
        <li key={reservation.id} className="flex items-center gap-2 rounded-lg pr-2 transition-colors hover:bg-muted/60">
          <Link
            href={`/reservations/${reservation.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ResourceTypeIcon resourceType={reservation.resourceType} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{reservationResourceLabel(reservation)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {userDisplayName(reservation.user)} · {formatDateTime(reservation.startAt)}
              </p>
            </div>
            <StatusBadge status={reservation.status} className="hidden sm:inline-flex" />
          </Link>
          {trailing?.(reservation)}
        </li>
      ))}
    </ul>
  );
}

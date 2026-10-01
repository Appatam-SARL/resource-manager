import { useEffect, useState } from 'react';
import type { Reservation } from '@resource-manager/types';
import {
  buildReservationSections,
  getNextReservation,
  hasReachedPastBoundary,
  splitBySegment,
  toReservationListItem,
  type ReservationListItem,
  type ReservationSection,
  type TemporalSegment,
} from '@/features/reservations/lib/reservation-list';
import type { ReservationFiltersValue } from '@/features/reservations/components/list/reservation-filters';
import { useInfiniteReservations, type ReservationListFilters } from './use-reservations';

type TimelineOptions = {
  filters: ReservationFiltersValue;
  segment: TemporalSegment | null;
  currentUserId: string | undefined;
  now: Date;
};

export function useReservationTimeline({ filters, segment, currentUserId, now }: TimelineOptions) {
  const queryFilters: ReservationListFilters = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
    ...(filters.scope === 'mine' && currentUserId ? { userId: currentUserId } : {}),
  };
  const query = useInfiniteReservations(queryFilters, Boolean(currentUserId));
  const [refreshing, setRefreshing] = useState(false);

  const byId = new Map<string, Reservation>();
  for (const page of query.data?.pages ?? []) {
    for (const reservation of page.data) byId.set(reservation.id, reservation);
  }
  const loaded = [...byId.values()];
  const pages = query.data?.pages;
  const total = pages?.[pages.length - 1]?.meta.total;

  const hasData = Boolean(query.data);
  const boundaryReached = hasData && (!query.hasNextPage || hasReachedPastBoundary(loaded, now));
  const canAutoFetch =
    hasData && !boundaryReached && !query.isFetchingNextPage && !query.isFetchNextPageError;

  // The API sorts by startAt desc: keep loading until every upcoming / active reservation is known.
  const { fetchNextPage } = query;
  useEffect(() => {
    if (canAutoFetch) void fetchNextPage({ cancelRefetch: false });
  }, [canAutoFetch, fetchNextPage]);

  const split = splitBySegment(loaded, now);
  const resolvedSegment: TemporalSegment =
    segment ?? (boundaryReached && split.active.length > 0 ? 'active' : 'upcoming');

  const counts: Partial<Record<TemporalSegment, number>> = boundaryReached
    ? {
        upcoming: split.upcoming.length,
        active: split.active.length,
        history:
          total !== undefined
            ? Math.max(0, total - split.upcoming.length - split.active.length)
            : undefined,
      }
    : {};

  const nextReservation = resolvedSegment === 'upcoming' ? getNextReservation(split.upcoming) : null;
  const nextItem: ReservationListItem | null = nextReservation
    ? toReservationListItem(nextReservation, now, currentUserId)
    : null;

  const segmentItems = split[resolvedSegment]
    .filter((reservation) => reservation.id !== nextReservation?.id)
    .map((reservation) => toReservationListItem(reservation, now, currentUserId));
  const sections: ReservationSection[] = buildReservationSections(segmentItems, resolvedSegment, now);

  const isSegmentComplete = resolvedSegment === 'history' || boundaryReached;

  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function loadMoreHistory() {
    if (
      resolvedSegment === 'history' &&
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      !query.isFetchNextPageError
    ) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }

  return {
    segment: resolvedSegment,
    sections,
    nextItem,
    counts,
    isInitialLoading: query.isPending || (hasData && !isSegmentComplete && !query.isFetchNextPageError),
    isError: query.isError && !hasData,
    isRetrying: query.isFetching,
    isFetchingMore: query.isFetchingNextPage && resolvedSegment === 'history',
    loadMoreFailed: query.isFetchNextPageError,
    isEmpty: sections.length === 0 && !nextItem,
    refreshing,
    refresh,
    retry: () => void query.refetch(),
    retryNextPage: () => void fetchNextPage({ cancelRefetch: false }),
    loadMoreHistory,
  };
}

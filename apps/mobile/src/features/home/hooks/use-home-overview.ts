import { useEffect, useState } from 'react';
import type { Reservation } from '@resource-manager/types';
import { useInfiniteReservations } from '@/features/reservations/hooks/use-reservations';
import { hasReachedPastBoundary } from '@/features/reservations/lib/reservation-list';
import { buildHomeOverview } from '@/features/home/lib/home';

/**
 * The user's own reservations (same query and cache as "Mes réservations").
 * The API sorts by startAt desc, so pages are loaded until every upcoming one is known.
 */
export function useHomeOverview(currentUserId: string | undefined, now: Date) {
  const query = useInfiniteReservations(
    currentUserId ? { userId: currentUserId } : {},
    Boolean(currentUserId),
  );
  const [refreshing, setRefreshing] = useState(false);

  const byId = new Map<string, Reservation>();
  for (const page of query.data?.pages ?? []) {
    for (const reservation of page.data) byId.set(reservation.id, reservation);
  }
  const loaded = [...byId.values()];

  const hasData = Boolean(query.data);
  const complete = hasData && (!query.hasNextPage || hasReachedPastBoundary(loaded, now));
  const canAutoFetch = hasData && !complete && !query.isFetchingNextPage && !query.isFetchNextPageError;

  const { fetchNextPage } = query;
  useEffect(() => {
    if (canAutoFetch) void fetchNextPage({ cancelRefetch: false });
  }, [canAutoFetch, fetchNextPage]);

  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return {
    overview: hasData ? buildHomeOverview(loaded, now, currentUserId) : null,
    isLoading: query.isPending || (hasData && !complete && !query.isFetchNextPageError),
    isError: query.isError && !hasData,
    isRetrying: query.isFetching,
    refreshing,
    refresh,
  };
}

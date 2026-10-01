'use client';

import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';
import { getTwoDayRange } from '../lib/dashboard';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getDashboardSummary()),
  });
}

export function useDashboardReservations(limit = 8) {
  return useQuery({
    queryKey: ['dashboard', 'reservations', limit],
    queryFn: () =>
      apiCallWithRefresh((client) =>
        client.getDashboardReservations({ limit } satisfies ListQueryParams),
      ),
  });
}

/** Yesterday + today from GET /calendar (scoped by the API), for the day agenda and its comparison. */
export function useDashboardTwoDays(now: Date) {
  const params: ListQueryParams = getTwoDayRange(now);
  return useQuery({
    queryKey: ['calendar', 'dashboard', params],
    queryFn: () => apiCallWithRefresh((client) => client.getCalendar(params)),
    staleTime: 60_000,
  });
}

export function useDashboardResources() {
  return useQuery({
    queryKey: ['dashboard', 'resources'],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getDashboardResources()),
  });
}

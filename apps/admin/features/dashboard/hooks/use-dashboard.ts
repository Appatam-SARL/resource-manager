'use client';

import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

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

export function useDashboardResources() {
  return useQuery({
    queryKey: ['dashboard', 'resources'],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getDashboardResources()),
  });
}

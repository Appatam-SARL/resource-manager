import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/client';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary(),
  });
}

export function useDashboardReservations(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'reservations', limit],
    queryFn: () => dashboardApi.reservations(limit),
  });
}

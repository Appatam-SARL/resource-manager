import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/client';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary(),
  });
}
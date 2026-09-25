import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { calendarApi } from '@/api/client';

export function useCalendar(params: ListQueryParams) {
  return useQuery({
    queryKey: ['calendar', params],
    queryFn: () => calendarApi.list(params),
    enabled: Boolean(params.startDate && params.endDate),
  });
}

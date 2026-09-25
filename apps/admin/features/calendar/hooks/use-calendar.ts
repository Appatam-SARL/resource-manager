'use client';

import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams, ResourceType } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type CalendarFilters = {
  startDate: string;
  endDate: string;
  companyId?: string;
  resourceType?: ResourceType | '';
};

export function useCalendar(filters: CalendarFilters) {
  const params: ListQueryParams = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    companyId: filters.companyId || undefined,
    resourceType: filters.resourceType || undefined,
  };

  return useQuery({
    queryKey: ['calendar', params],
    enabled: Boolean(filters.startDate && filters.endDate),
    queryFn: () =>
      apiCallWithRefresh((client) => client.getCalendar(params)),
  });
}

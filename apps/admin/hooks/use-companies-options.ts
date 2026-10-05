'use client';

import { useQuery } from '@tanstack/react-query';
import type { Company, ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useCompaniesOptions(enabled = true) {
  return useQuery({
    queryKey: ['companies', 'options'],
    enabled,
    queryFn: () =>
      apiCallWithRefresh((client) =>
        client.getCompanies({ page: 1, limit: 100, status: 'ACTIVE' } satisfies ListQueryParams),
      ),
    select: (result): Company[] => result.data,
  });
}

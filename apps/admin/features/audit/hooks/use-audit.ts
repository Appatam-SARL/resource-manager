'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuditAction, ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type AuditFilters = {
  page?: number;
  limit?: number;
  action?: AuditAction | '';
  entity?: string;
  userId?: string;
};

export function useAuditLogs(filters: AuditFilters) {
  const params: ListQueryParams = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    action: filters.action || undefined,
    entity: filters.entity || undefined,
    userId: filters.userId || undefined,
  };

  return useQuery({
    queryKey: ['audit', params],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getAuditLogs(params)),
  });
}

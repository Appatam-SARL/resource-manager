import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { vehiclesApi } from '@/api/client';

export function useVehicles(params?: ListQueryParams) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', id],
    enabled: Boolean(id),
    queryFn: () => vehiclesApi.get(id!),
  });
}

import { useQuery } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { roomsApi } from '@/api/client';

export function useRooms(params?: ListQueryParams) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => roomsApi.list(params),
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ['rooms', id],
    enabled: Boolean(id),
    queryFn: () => roomsApi.get(id!),
  });
}

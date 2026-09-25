'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useDirections(
  params: ListQueryParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['directions', params],
    queryFn: () => apiCallWithRefresh((api) => api.getDirections(params)),
    enabled: options?.enabled ?? true,
  });
}

export function useDirection(id: string, enabled = true) {
  return useQuery({
    queryKey: ['directions', id],
    queryFn: () => apiCallWithRefresh((api) => api.getDirection(id)),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((api) => api.createDirection(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['directions'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiCallWithRefresh((api) => api.updateDirection(id, body)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['directions'] });
      void queryClient.invalidateQueries({
        queryKey: ['directions', variables.id],
      });
    },
  });
}

export function useUpdateDirectionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiCallWithRefresh((api) => api.updateDirectionStatus(id, { status })),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['directions'] });
      void queryClient.invalidateQueries({
        queryKey: ['directions', variables.id],
      });
    },
  });
}

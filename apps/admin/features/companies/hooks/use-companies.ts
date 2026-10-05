'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useCompanies(params: ListQueryParams = {}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => apiCallWithRefresh((api) => api.getCompanies(params)),
  });
}

export function useCompany(id: string, enabled = true) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => apiCallWithRefresh((api) => api.getCompany(id)),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((api) => api.createCompany(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiCallWithRefresh((api) => api.updateCompany(id, body)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}

export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiCallWithRefresh((api) => api.updateCompanyStatus(id, { status })),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}

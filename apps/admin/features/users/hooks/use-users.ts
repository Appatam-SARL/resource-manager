'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useUsers(params: ListQueryParams = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiCallWithRefresh((api) => api.getUsers(params)),
  });
}

export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiCallWithRefresh((api) => api.getUser(id)),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((api) => api.createUser(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['directions'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiCallWithRefresh((api) => api.updateUser(id, body)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiCallWithRefresh((api) => api.updateUserStatus(id, { status })),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}

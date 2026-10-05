'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export function useGroup() {
  return useQuery({
    queryKey: ['group'],
    queryFn: () => apiCallWithRefresh((api) => api.getGroup()),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiCallWithRefresh((api) => api.updateGroup(id, { name })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['group'] });
    },
  });
}

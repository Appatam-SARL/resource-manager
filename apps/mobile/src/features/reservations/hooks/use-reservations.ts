import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQueryParams } from '@resource-manager/types';
import { reservationsApi } from '@/api/client';

export function useReservations(params?: ListQueryParams) {
  return useQuery({
    queryKey: ['reservations', params],
    queryFn: () => reservationsApi.list(params),
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ['reservations', id],
    enabled: Boolean(id),
    queryFn: () => reservationsApi.get(id!),
  });
}

export function useAvailability(
  params:
    | {
        resourceType: string;
        resourceId: string;
        startAt: string;
        endAt: string;
      }
    | null,
) {
  return useQuery({
    queryKey: ['availability', params],
    enabled: Boolean(params?.resourceId && params.startAt && params.endAt),
    queryFn: () => reservationsApi.checkAvailability(params!),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => reservationsApi.create(body),
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    retry: 0,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reservations', id] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useCheckAvailabilityMutation() {
  return useMutation({
    mutationFn: (params: {
      resourceType: string;
      resourceId: string;
      startAt: string;
      endAt: string;
    }) => reservationsApi.checkAvailability(params),
    retry: 0,
  });
}

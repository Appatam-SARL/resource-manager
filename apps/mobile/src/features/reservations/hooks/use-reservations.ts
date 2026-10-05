import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  ListQueryParams,
  ReservationStatus,
  ResourceType,
} from '@resource-manager/types';
import { reservationsApi } from '@/api/client';

export function useReservations(params?: ListQueryParams) {
  return useQuery({
    queryKey: ['reservations', params],
    queryFn: () => reservationsApi.list(params),
  });
}

export type ReservationListFilters = {
  status?: ReservationStatus;
  resourceType?: ResourceType;
  userId?: string;
};

const RESERVATIONS_PAGE_SIZE = 50;

/** Page-based infinite list on top of GET /reservations (sorted by startAt desc). */
export function useInfiniteReservations(filters: ReservationListFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['reservations', 'infinite', filters],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      reservationsApi.list({ ...filters, page: pageParam, limit: RESERVATIONS_PAGE_SIZE }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ['reservations', id],
    enabled: Boolean(id),
    queryFn: () => reservationsApi.get(id!),
  });
}

export type AvailabilityParams = {
  resourceType: ResourceType;
  resourceId: string;
  startAt: string;
  endAt: string;
};

export function useAvailability(params: AvailabilityParams | null) {
  return useQuery({
    queryKey: ['availability', params],
    enabled: Boolean(params?.resourceId && params.startAt && params.endAt),
    queryFn: ({ signal }) => reservationsApi.checkAvailability(params!, signal),
    staleTime: 10_000,
  });
}

export type CreateReservationBody =
  | {
      resourceType: 'VEHICLE';
      vehicleId: string;
      startAt: string;
      endAt: string;
      destination: string;
      missionReason: string;
      passengerCount: number;
      comment?: string;
    }
  | {
      resourceType: 'ROOM';
      roomId: string;
      startAt: string;
      endAt: string;
      meetingSubject: string;
      participantCount: number;
      comment?: string;
    };

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReservationBody) => reservationsApi.create(body),
    retry: 0,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useExtendReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newEndAt }: { id: string; newEndAt: string }) =>
      reservationsApi.extend(id, newEndAt),
    retry: 0,
    onSuccess: (reservation) => {
      queryClient.setQueryData(['reservations', reservation.id], reservation);
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
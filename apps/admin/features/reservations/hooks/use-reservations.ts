'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListQueryParams,
  ReservationStatus,
  ResourceType,
} from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type ReservationFilters = {
  page?: number;
  limit?: number;
  companyId?: string;
  directionId?: string;
  vehicleId?: string;
  roomId?: string;
  userId?: string;
  status?: ReservationStatus | '';
  resourceType?: ResourceType | '';
};

export function useReservations(filters: ReservationFilters) {
  const params: ListQueryParams = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    companyId: filters.companyId || undefined,
    directionId: filters.directionId || undefined,
    vehicleId: filters.vehicleId || undefined,
    roomId: filters.roomId || undefined,
    userId: filters.userId || undefined,
    status: filters.status || undefined,
    resourceType: filters.resourceType || undefined,
  };

  return useQuery({
    queryKey: ['reservations', params],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getReservations(params)),
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ['reservations', id],
    enabled: Boolean(id),
    queryFn: () =>
      apiCallWithRefresh((client) => client.getReservation(id!)),
  });
}

export function useApproveReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCallWithRefresh((client) => client.approveReservation(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Réservation approuvée');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible d’approuver la réservation',
      );
    },
  });
}

export function useRejectReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason: string;
    }) =>
      apiCallWithRefresh((client) =>
        client.rejectReservation(id, { rejectionReason }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Réservation refusée');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de refuser la réservation',
      );
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCallWithRefresh((client) => client.cancelReservation(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Réservation annulée');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible d’annuler la réservation',
      );
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListQueryParams,
  ResourceStatus,
} from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type RoomFilters = {
  page?: number;
  limit?: number;
  companyId?: string;
  status?: ResourceStatus | '';
  search?: string;
};

export function useRooms(filters: RoomFilters) {
  const params: ListQueryParams = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    companyId: filters.companyId || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };

  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => apiCallWithRefresh((client) => client.getRooms(params)),
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ['rooms', id],
    enabled: Boolean(id),
    queryFn: () => apiCallWithRefresh((client) => client.getRoom(id!)),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.createRoom(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Salle créée');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de créer la salle',
      );
    },
  });
}

export function useUpdateRoom(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.updateRoom(id, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Salle mise à jour');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de mettre à jour la salle',
      );
    },
  });
}

export function useUpdateRoomStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ResourceStatus) =>
      apiCallWithRefresh((client) =>
        client.updateRoomStatus(id, { status }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Statut de la salle mis à jour');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de changer le statut',
      );
    },
  });
}

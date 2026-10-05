'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListQueryParams,
  ResourceStatus,
} from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type VehicleFilters = {
  page?: number;
  limit?: number;
  companyId?: string;
  status?: ResourceStatus | '';
  search?: string;
};

export function useVehicles(filters: VehicleFilters) {
  const params: ListQueryParams = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    companyId: filters.companyId || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };

  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () =>
      apiCallWithRefresh((client) => client.getVehicles(params)),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', id],
    enabled: Boolean(id),
    queryFn: () =>
      apiCallWithRefresh((client) => client.getVehicle(id!)),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.createVehicle(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Véhicule créé');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de créer le véhicule',
      );
    },
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.updateVehicle(id, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Véhicule mis à jour');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Impossible de mettre à jour le véhicule',
      );
    },
  });
}

export function useUpdateVehicleStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ResourceStatus) =>
      apiCallWithRefresh((client) =>
        client.updateVehicleStatus(id, { status }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Statut du véhicule mis à jour');
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

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EquipmentScope,
  ListQueryParams,
  ResourceStatus,
} from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';

export type EquipmentFilters = {
  page?: number;
  limit?: number;
  status?: ResourceStatus | '';
  scope?: EquipmentScope | '';
  search?: string;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useEquipments(filters: EquipmentFilters) {
  const params: ListQueryParams = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status || undefined,
    scope: filters.scope || undefined,
    search: filters.search || undefined,
  };

  return useQuery({
    queryKey: ['equipments', params],
    queryFn: () => apiCallWithRefresh((client) => client.getEquipments(params)),
  });
}

export function useEquipment(id: string | undefined) {
  return useQuery({
    queryKey: ['equipments', id],
    enabled: Boolean(id),
    queryFn: () => apiCallWithRefresh((client) => client.getEquipment(id!)),
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.createEquipment(body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Équipement créé');
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, 'Impossible de créer l’équipement'));
    },
  });
}

export function useUpdateEquipment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiCallWithRefresh((client) => client.updateEquipment(id, body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Équipement mis à jour');
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, 'Impossible de mettre à jour l’équipement'));
    },
  });
}

export function useUpdateEquipmentStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: ResourceStatus) =>
      apiCallWithRefresh((client) => client.updateEquipmentStatus(id, { status })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Statut de l’équipement mis à jour');
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, 'Impossible de changer le statut'));
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCallWithRefresh((client) => client.deleteEquipment(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Équipement supprimé');
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, 'Impossible de supprimer l’équipement'));
    },
  });
}

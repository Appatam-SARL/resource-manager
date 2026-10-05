'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Vehicle } from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import { toast } from 'sonner';
import { apiCallWithRefresh } from '@/hooks/use-api-client';
import {
  VehicleImageError,
  prepareVehicleImage,
  readAsDataUrl,
} from '@/features/vehicles/lib/prepare-vehicle-image';

/**
 * The image endpoint requires the bearer token, so it cannot be used directly in <img src>:
 * the bytes are fetched and cached as a data URL, keyed by the image version.
 */
export function useVehicleImageUrl(vehicle: Pick<Vehicle, 'id' | 'image'> | undefined) {
  const version = vehicle?.image?.updatedAt;
  const query = useQuery({
    queryKey: ['vehicles', vehicle?.id, 'image', version],
    enabled: Boolean(vehicle?.id && version),
    staleTime: Infinity,
    queryFn: async () =>
      readAsDataUrl(
        await apiCallWithRefresh((client) => client.getVehicleImage(vehicle!.id)),
      ),
  });

  return {
    url: version ? (query.data ?? null) : null,
    isLoading: Boolean(version) && query.isPending,
    isError: query.isError,
  };
}

export function vehicleImageErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof VehicleImageError) return error.message;
  if (error instanceof ApiError) {
    return error.status === 413 ? 'L’image ne doit pas dépasser 2 Mo.' : error.message;
  }
  return fallback;
}

export async function uploadVehicleImageFile(vehicleId: string, file: File): Promise<Vehicle> {
  const image = await prepareVehicleImage(file);
  return apiCallWithRefresh((client) => client.uploadVehicleImage(vehicleId, image));
}

export function useUploadVehicleImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadVehicleImageFile(id, file),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(['vehicles', id], vehicle);
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Photo du véhicule enregistrée');
    },
    onError: (error: unknown) => {
      toast.error(vehicleImageErrorMessage(error, 'Impossible d’enregistrer la photo'));
    },
  });
}

export function useDeleteVehicleImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiCallWithRefresh((client) => client.deleteVehicleImage(id)),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(['vehicles', id], vehicle);
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Photo du véhicule supprimée');
    },
    onError: (error: unknown) => {
      toast.error(vehicleImageErrorMessage(error, 'Impossible de supprimer la photo'));
    },
  });
}
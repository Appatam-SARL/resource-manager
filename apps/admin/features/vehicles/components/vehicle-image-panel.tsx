'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { Vehicle } from '@resource-manager/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Panel } from '@/components/shared/panel';
import { Button } from '@/components/ui/button';
import {
  useDeleteVehicleImage,
  useUploadVehicleImage,
  useVehicleImageUrl,
} from '@/features/vehicles/hooks/use-vehicle-image';
import { VEHICLE_IMAGE_ACCEPT } from '@/features/vehicles/lib/prepare-vehicle-image';
import { VehicleImageFrame } from './vehicle-image-frame';

type VehicleImagePanelProps = {
  vehicle: Vehicle;
  canManage: boolean;
};

export function VehicleImagePanel({ vehicle, canManage }: VehicleImagePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const image = useVehicleImageUrl(vehicle);
  const uploadMutation = useUploadVehicleImage(vehicle.id);
  const deleteMutation = useDeleteVehicleImage(vehicle.id);
  const busy = uploadMutation.isPending || deleteMutation.isPending;
  const hasImage = Boolean(vehicle.image);

  return (
    <Panel title="Photo" description={canManage ? 'Facultative. Visible lors de la réservation.' : undefined}>
      <div className="space-y-3">
        <VehicleImageFrame
          src={image.url}
          alt={`Photo du véhicule ${vehicle.brand} ${vehicle.model}`}
          loading={image.isLoading || uploadMutation.isPending}
          emptyLabel={image.isError ? 'Photo indisponible' : 'Aucune photo'}
        />
        {canManage ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={VEHICLE_IMAGE_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) uploadMutation.mutate(file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                <ImagePlus aria-hidden />
                {hasImage ? 'Remplacer' : 'Ajouter une photo'}
              </Button>
              {hasImage ? (
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden />
                  Supprimer
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer la photo"
        description="La photo ne sera plus affichée aux collaborateurs. Vous pourrez en ajouter une autre à tout moment."
        confirmLabel="Supprimer"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate();
          setConfirmDelete(false);
        }}
      />
    </Panel>
  );
}

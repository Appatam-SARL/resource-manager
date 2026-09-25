'use client';

import { use } from 'react';
import type { ResourceStatus } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  VehicleForm,
  useVehicle,
  useUpdateVehicle,
  useUpdateVehicleStatus,
} from '@/features/vehicles';
import { RESOURCE_STATUS_LABELS } from '@/lib/format';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function VehicleDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const vehicleQuery = useVehicle(id);
  const updateMutation = useUpdateVehicle(id);
  const statusMutation = useUpdateVehicleStatus(id);
  const canManage = user ? canManageResources(user.role) : false;

  if (vehicleQuery.isLoading) {
    return <LoadingState label="Chargement du véhicule…" />;
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <ErrorState
        title="Véhicule introuvable"
        onRetry={() => {
          void vehicleQuery.refetch();
        }}
      />
    );
  }

  const vehicle = vehicleQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}`}
        description={`${vehicle.registrationNumber} · ${vehicle.company?.name ?? 'Entreprise'}`}
        actions={<StatusBadge status={vehicle.status} />}
      />

      {canManage ? (
        <div className="space-y-1.5 rounded-3xl bg-card p-5 ring-1 ring-border/60">
          <Label>Statut du véhicule</Label>
          <Select
            value={vehicle.status}
            onValueChange={(value) => {
              if (value && value !== vehicle.status) {
                statusMutation.mutate(value as ResourceStatus);
              }
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {RESOURCE_STATUS_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Préférez le changement de statut à la suppression.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <VehicleForm
          initial={vehicle}
          loading={updateMutation.isPending}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (values) => {
            // companyId is immutable on update
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit companyId
            const { companyId, ...payload } = values;
            await updateMutation.mutateAsync(payload);
            void vehicleQuery.refetch();
          }}
        />
      ) : (
        <div className="space-y-3 rounded-3xl bg-card p-5 text-sm ring-1 ring-border/60">
          <p>
            <span className="text-muted-foreground">Places :</span>{' '}
            {vehicle.seats}
          </p>
          <p>
            <span className="text-muted-foreground">Description :</span>{' '}
            {vehicle.description || '—'}
          </p>
        </div>
      )}
    </div>
  );
}

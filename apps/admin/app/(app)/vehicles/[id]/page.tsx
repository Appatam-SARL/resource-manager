'use client';

import { use } from 'react';
import { Building2 } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ResourceStatusPanel } from '@/components/shared/resource-status-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { ResourceReservationsPanel } from '@/features/reservations';
import {
  VehicleForm,
  VehicleImagePanel,
  useUpdateVehicle,
  useUpdateVehicleStatus,
  useVehicle,
} from '@/features/vehicles';
import { canManageResource } from '@/lib/reservation-permissions';
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
  if (vehicleQuery.isLoading) {
    return <LoadingState label="Chargement du véhicule…" />;
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <DetailErrorState
        error={vehicleQuery.error}
        notFoundTitle="Véhicule introuvable"
        errorTitle="Impossible de charger le véhicule"
        backHref="/vehicles"
        backLabel="Retour aux véhicules"
        onRetry={() => void vehicleQuery.refetch()}
        retrying={vehicleQuery.isFetching}
      />
    );
  }

  const vehicle = vehicleQuery.data;
  const canManage = user ? canManageResource(user, vehicle) : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/vehicles', label: 'Véhicules' }}
        title={`${vehicle.brand} ${vehicle.model}`}
        meta={
          <>
            <StatusBadge status={vehicle.status} />
            <span className="font-mono uppercase">{vehicle.registrationNumber}</span>
            {vehicle.company ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden />
                {vehicle.company.name}
              </span>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {canManage ? (
            <VehicleForm
              initial={vehicle}
              loading={updateMutation.isPending}
              submitLabel="Enregistrer les modifications"
              onSubmit={async (values) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- companyId is immutable on update
                const { companyId, ...payload } = values;
                await updateMutation.mutateAsync(payload);
              }}
            />
          ) : (
            <Panel title="Caractéristiques">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Places</dt>
                  <dd className="text-sm text-foreground">{vehicle.seats}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                  <dd className="text-sm whitespace-pre-line text-foreground">{vehicle.description || '—'}</dd>
                </div>
              </dl>
            </Panel>
          )}
        </div>
        <div className="space-y-4">
          <VehicleImagePanel vehicle={vehicle} canManage={canManage} />
          <ResourceStatusPanel
            status={vehicle.status}
            resourceLabel="ce véhicule"
            canManage={canManage}
            pending={statusMutation.isPending}
            onChange={(status) => statusMutation.mutate(status)}
          />
          <ResourceReservationsPanel vehicleId={vehicle.id} />
        </div>
      </div>
    </div>
  );
}

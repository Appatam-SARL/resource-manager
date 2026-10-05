'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Vehicle } from '@resource-manager/types';
import { Car, Users } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAuth } from '@/providers/auth-provider';

type VehiclesTableProps = {
  data: Vehicle[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function VehicleIdentity({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ResourceTypeIcon resourceType="VEHICLE" size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">
          {vehicle.brand} {vehicle.model}
        </span>
        <span className="block font-mono text-xs text-muted-foreground uppercase">{vehicle.registrationNumber}</span>
      </span>
    </Link>
  );
}

export function VehiclesTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: VehiclesTableProps) {
  const { user } = useAuth();
  const showCompany = user?.role === 'GROUP_ADMIN';

  const columns: DataTableColumn<Vehicle>[] = [
    { id: 'vehicle', header: 'Véhicule', cell: (row) => <VehicleIdentity vehicle={row} /> },
    {
      id: 'seats',
      header: 'Places',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground tabular-nums">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          {row.seats}
        </span>
      ),
    },
    ...(showCompany
      ? [{ id: 'company', header: 'Entreprise', cell: (row: Vehicle) => row.company?.name ?? '—' }]
      : []),
    { id: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      toolbar={toolbar}
      footer={footer}
      caption="Liste des véhicules"
      emptyIcon={Car}
      emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucun véhicule'}
      emptyDescription={
        hasActiveFilters
          ? 'Aucun véhicule ne correspond à votre recherche.'
          : 'Ajoutez le premier véhicule de la flotte pour permettre les réservations.'
      }
      emptyAction={emptyAction}
      mobileCard={(row) => (
        <div className="space-y-2">
          <VehicleIdentity vehicle={row} />
          <div className="flex items-center gap-3 pl-11 text-xs text-muted-foreground">
            <StatusBadge status={row.status} />
            <span>{row.seats} places</span>
            {showCompany && row.company ? <span className="truncate">{row.company.name}</span> : null}
          </div>
        </div>
      )}
    />
  );
}

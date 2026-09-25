'use client';

import Link from 'next/link';
import type { Vehicle } from '@resource-manager/types';
import { Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

type VehiclesTableProps = {
  data: Vehicle[];
  isLoading?: boolean;
};

export function VehiclesTable({ data, isLoading }: VehiclesTableProps) {
  const columns: DataTableColumn<Vehicle>[] = [
    {
      id: 'registrationNumber',
      header: 'Immatriculation',
      cell: (row) => (
        <span className="font-medium">{row.registrationNumber}</span>
      ),
    },
    {
      id: 'brand',
      header: 'Marque',
      cell: (row) => row.brand,
    },
    {
      id: 'model',
      header: 'Modèle',
      cell: (row) => row.model,
    },
    {
      id: 'seats',
      header: 'Places',
      cell: (row) => row.seats,
    },
    {
      id: 'company',
      header: 'Entreprise',
      cell: (row) => row.company?.name ?? '—',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Link
          href={`/vehicles/${row.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Eye className="size-3.5" />
          Voir
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyTitle="Aucun véhicule"
      emptyDescription="Aucun véhicule ne correspond à vos filtres."
    />
  );
}

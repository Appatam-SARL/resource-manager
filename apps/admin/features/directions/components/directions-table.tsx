'use client';

import Link from 'next/link';
import type { Direction } from '@resource-manager/types';
import { Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

type DirectionsTableProps = {
  data: Direction[];
  isLoading?: boolean;
};

export function DirectionsTable({ data, isLoading }: DirectionsTableProps) {
  const columns: DataTableColumn<Direction>[] = [
    {
      id: 'name',
      header: 'Nom',
      cell: (row) => <span className="font-medium">{row.name}</span>,
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
      id: 'users',
      header: 'Utilisateurs',
      cell: (row) => row._count?.users ?? 0,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Link
          href={`/directions/${row.id}`}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
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
      emptyTitle="Aucune direction"
      emptyDescription="Les entreprises peuvent fonctionner sans direction. Créez-en une si nécessaire."
    />
  );
}

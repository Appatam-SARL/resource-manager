'use client';

import Link from 'next/link';
import type { Company } from '@resource-manager/types';
import { Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

type CompaniesTableProps = {
  data: Company[];
  isLoading?: boolean;
};

export function CompaniesTable({ data, isLoading }: CompaniesTableProps) {
  const columns: DataTableColumn<Company>[] = [
    {
      id: 'name',
      header: 'Nom',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'code',
      header: 'Code',
      cell: (row) => (
        <span className="text-muted-foreground">{row.code ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'directions',
      header: 'Directions',
      cell: (row) => row._count?.directions ?? 0,
    },
    {
      id: 'users',
      header: 'Utilisateurs',
      cell: (row) => row._count?.users ?? 0,
    },
    {
      id: 'resources',
      header: 'Ressources',
      cell: (row) =>
        (row._count?.vehicles ?? 0) + (row._count?.meetingRooms ?? 0),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Link
          href={`/companies/${row.id}`}
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
      emptyTitle="Aucune entreprise"
      emptyDescription="Créez une entreprise pour commencer à organiser vos ressources."
    />
  );
}

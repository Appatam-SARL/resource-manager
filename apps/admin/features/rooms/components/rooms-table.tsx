'use client';

import Link from 'next/link';
import type { MeetingRoom } from '@resource-manager/types';
import { Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

type RoomsTableProps = {
  data: MeetingRoom[];
  isLoading?: boolean;
};

export function RoomsTable({ data, isLoading }: RoomsTableProps) {
  const columns: DataTableColumn<MeetingRoom>[] = [
    {
      id: 'name',
      header: 'Nom',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'location',
      header: 'Localisation',
      cell: (row) => row.location || '—',
    },
    {
      id: 'capacity',
      header: 'Capacité',
      cell: (row) => row.capacity,
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
          href={`/rooms/${row.id}`}
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
      emptyTitle="Aucune salle"
      emptyDescription="Aucune salle ne correspond à vos filtres."
    />
  );
}

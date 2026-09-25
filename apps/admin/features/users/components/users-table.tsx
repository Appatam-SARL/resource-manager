'use client';

import Link from 'next/link';
import type { User } from '@resource-manager/types';
import { Eye } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ROLE_LABELS } from '@/lib/rbac';

type UsersTableProps = {
  data: User[];
  isLoading?: boolean;
};

export function UsersTable({ data, isLoading }: UsersTableProps) {
  const columns: DataTableColumn<User>[] = [
    {
      id: 'name',
      header: 'Nom',
      cell: (row) => (
        <span className="font-medium">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: (row) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: 'company',
      header: 'Entreprise',
      cell: (row) => row.company?.name ?? '—',
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: (row) => row.direction?.name ?? '—',
    },
    {
      id: 'role',
      header: 'Rôle',
      cell: (row) => ROLE_LABELS[row.role as keyof typeof ROLE_LABELS],
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
          href={`/users/${row.id}`}
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
      emptyTitle="Aucun utilisateur"
      emptyDescription="Ajoutez un utilisateur pour lui donner accès aux ressources."
    />
  );
}

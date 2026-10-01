'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Direction } from '@resource-manager/types';
import { Eye, Network, Power, PowerOff, Users } from 'lucide-react';
import {
  DataTable,
  type DataTableAction,
  type DataTableColumn,
} from '@/components/shared/data-table';
import { EntityIcon } from '@/components/shared/entity-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { useDirectionStatusToggle } from '@/features/directions/hooks/use-direction-status-toggle';
import { useAuth } from '@/providers/auth-provider';

type DirectionsTableProps = {
  data: Direction[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function DirectionIdentity({ direction }: { direction: Direction }) {
  return (
    <Link
      href={`/directions/${direction.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <EntityIcon icon={Network} size="sm" muted={direction.status === 'INACTIVE'} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">{direction.name}</span>
        {direction.code ? (
          <span className="block font-mono text-xs text-muted-foreground">{direction.code}</span>
        ) : null}
      </span>
    </Link>
  );
}

function UsersCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground tabular-nums">
      <Users className="size-3.5 text-muted-foreground" aria-hidden />
      {count}
    </span>
  );
}

export function DirectionsTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: DirectionsTableProps) {
  const { user } = useAuth();
  const statusToggle = useDirectionStatusToggle();
  const showCompany = user?.role === 'GROUP_ADMIN';

  const columns: DataTableColumn<Direction>[] = [
    { id: 'direction', header: 'Direction', cell: (row) => <DirectionIdentity direction={row} /> },
    ...(showCompany
      ? [
          {
            id: 'company',
            header: 'Entreprise',
            cell: (row: Direction) => <span className="truncate text-sm text-foreground">{row.company?.name ?? '—'}</span>,
          },
        ]
      : []),
    { id: 'users', header: 'Utilisateurs', cell: (row) => <UsersCount count={row._count?.users ?? 0} /> },
    { id: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const rowActions = (row: Direction): DataTableAction[] => [
    { label: 'Voir la fiche', icon: Eye, href: `/directions/${row.id}` },
    row.status === 'ACTIVE'
      ? { label: 'Désactiver', icon: PowerOff, destructive: true, separated: true, onSelect: () => statusToggle.request(row) }
      : { label: 'Réactiver', icon: Power, separated: true, onSelect: () => statusToggle.request(row) },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        toolbar={toolbar}
        footer={footer}
        caption="Liste des directions"
        emptyIcon={Network}
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune direction'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucune direction ne correspond à ces critères.'
            : 'Les directions sont facultatives : une entreprise peut fonctionner sans. Créez-en une si votre organisation le nécessite.'
        }
        emptyAction={emptyAction}
        rowActions={rowActions}
        mobileCard={(row) => (
          <div className="space-y-2">
            <DirectionIdentity direction={row} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11">
              <StatusBadge status={row.status} />
              <UsersCount count={row._count?.users ?? 0} />
              {showCompany && row.company ? (
                <span className="truncate text-xs text-muted-foreground">{row.company.name}</span>
              ) : null}
            </div>
          </div>
        )}
      />
      {statusToggle.dialog}
    </>
  );
}

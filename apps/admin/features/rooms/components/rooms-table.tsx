'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { MeetingRoom } from '@resource-manager/types';
import { DoorOpen, Users } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAuth } from '@/providers/auth-provider';

type RoomsTableProps = {
  data: MeetingRoom[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function RoomIdentity({ room }: { room: MeetingRoom }) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ResourceTypeIcon resourceType="ROOM" size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground group-hover:underline">{room.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{room.location || 'Localisation non renseignée'}</span>
      </span>
    </Link>
  );
}

export function RoomsTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: RoomsTableProps) {
  const { user } = useAuth();
  const showCompany = user?.role === 'GROUP_ADMIN';

  const columns: DataTableColumn<MeetingRoom>[] = [
    { id: 'room', header: 'Salle', cell: (row) => <RoomIdentity room={row} /> },
    {
      id: 'capacity',
      header: 'Capacité',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground tabular-nums">
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          {row.capacity}
        </span>
      ),
    },
    ...(showCompany
      ? [{ id: 'company', header: 'Entreprise', cell: (row: MeetingRoom) => row.company?.name ?? '—' }]
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
      caption="Liste des salles"
      emptyIcon={DoorOpen}
      emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune salle'}
      emptyDescription={
        hasActiveFilters
          ? 'Aucune salle ne correspond à votre recherche.'
          : 'Ajoutez une première salle de réunion pour permettre les réservations.'
      }
      emptyAction={emptyAction}
      mobileCard={(row) => (
        <div className="space-y-2">
          <RoomIdentity room={row} />
          <div className="flex items-center gap-3 pl-11 text-xs text-muted-foreground">
            <StatusBadge status={row.status} />
            <span>{row.capacity} places</span>
            {showCompany && row.company ? <span className="truncate">{row.company.name}</span> : null}
          </div>
        </div>
      )}
    />
  );
}

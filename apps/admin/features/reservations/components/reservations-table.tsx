'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AuthUser, Reservation } from '@resource-manager/types';
import { Ban, CalendarSearch, Check, Eye, X } from 'lucide-react';
import {
  DataTable,
  type DataTableAction,
  type DataTableColumn,
} from '@/components/shared/data-table';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useReservationDecisions } from '@/features/reservations/hooks/use-reservation-decisions';
import { formatReservationPeriod } from '@/features/reservations/lib/reservation-display';
import {
  reservationResourceLabel,
  RESOURCE_TYPE_LABELS,
  userDisplayName,
} from '@/lib/format';
import {
  canApproveOrReject,
  canCancelReservation,
} from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

type ReservationsTableProps = {
  data: Reservation[];
  isLoading?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyAction?: ReactNode;
  hasActiveFilters?: boolean;
};

function organizationLine(reservation: Reservation, showCompany: boolean): string {
  const parts = [showCompany ? reservation.company?.name : undefined, reservation.direction?.name];
  return parts.filter(Boolean).join(' · ');
}

function buildRowActions(
  user: AuthUser | null,
  reservation: Reservation,
  decisions: ReturnType<typeof useReservationDecisions>,
): DataTableAction[] {
  const actions: DataTableAction[] = [
    { label: 'Voir le détail', icon: Eye, href: `/reservations/${reservation.id}` },
  ];
  if (!user) return actions;

  if (canApproveOrReject(user, reservation)) {
    actions.push(
      { label: 'Approuver', icon: Check, onSelect: () => decisions.approve(reservation.id), separated: true },
      { label: 'Refuser', icon: X, onSelect: () => decisions.reject(reservation.id) },
    );
  }
  if (canCancelReservation(user, reservation)) {
    actions.push({
      label: 'Annuler la réservation',
      icon: Ban,
      destructive: true,
      separated: true,
      onSelect: () => decisions.cancel(reservation.id),
    });
  }
  return actions;
}

export function ReservationsTable({
  data,
  isLoading,
  toolbar,
  footer,
  emptyAction,
  hasActiveFilters = false,
}: ReservationsTableProps) {
  const { user } = useAuth();
  const decisions = useReservationDecisions();
  const showCompany = user?.role === 'GROUP_ADMIN';

  const columns: DataTableColumn<Reservation>[] = [
    {
      id: 'resource',
      header: 'Ressource',
      cell: (row) => (
        <Link
          href={`/reservations/${row.id}`}
          className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ResourceTypeIcon resourceType={row.resourceType} size="sm" />
          <span className="min-w-0">
            <span className="block max-w-[260px] truncate font-medium text-foreground group-hover:underline">
              {reservationResourceLabel(row)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {RESOURCE_TYPE_LABELS[row.resourceType]}
              {row.resourceType === 'VEHICLE' && row.destination ? ` · ${row.destination}` : null}
              {row.resourceType === 'ROOM' && row.meetingSubject ? ` · ${row.meetingSubject}` : null}
            </span>
          </span>
        </Link>
      ),
    },
    {
      id: 'user',
      header: 'Demandeur',
      cell: (row) => {
        const organization = organizationLine(row, showCompany);
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <UserAvatar firstName={row.user?.firstName} lastName={row.user?.lastName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{userDisplayName(row.user)}</p>
              {organization ? (
                <p className="max-w-[220px] truncate text-xs text-muted-foreground">{organization}</p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'period',
      header: 'Période',
      cell: (row) => {
        const period = formatReservationPeriod(row.startAt, row.endAt);
        return (
          <div className="whitespace-nowrap">
            <p className="text-sm text-foreground">{period.day}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{period.time}</p>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (row) => <StatusBadge status={row.status} />,
    },
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
        caption="Liste des réservations"
        emptyIcon={CalendarSearch}
        emptyTitle={hasActiveFilters ? 'Aucun résultat' : 'Aucune réservation'}
        emptyDescription={
          hasActiveFilters
            ? 'Aucune réservation ne correspond à ces filtres.'
            : 'Les demandes de réservation de votre périmètre apparaîtront ici.'
        }
        emptyAction={emptyAction}
        rowActions={(row) => buildRowActions(user, row, decisions)}
        mobileCard={(row) => {
          const period = formatReservationPeriod(row.startAt, row.endAt);
          return (
            <Link href={`/reservations/${row.id}`} className="flex min-w-0 gap-3">
              <ResourceTypeIcon resourceType={row.resourceType} size="sm" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">{reservationResourceLabel(row)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {userDisplayName(row.user)} · {period.day} · {period.time}
                </p>
                <StatusBadge status={row.status} />
              </div>
            </Link>
          );
        }}
      />
      {decisions.dialogs}
    </>
  );
}

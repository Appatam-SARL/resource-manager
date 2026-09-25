'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Reservation } from '@resource-manager/types';
import { Check, Eye, X } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { RejectReservationDialog } from '@/features/reservations/components/reject-reservation-dialog';
import {
  useApproveReservation,
  useCancelReservation,
  useRejectReservation,
} from '@/features/reservations/hooks/use-reservations';
import {
  formatDateTime,
  reservationResourceLabel,
  RESOURCE_TYPE_LABELS,
  userDisplayName,
} from '@/lib/format';
import {
  canApproveOrReject,
  canCancelReservation,
} from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

type ReservationsTableProps = {
  data: Reservation[];
  isLoading?: boolean;
};

export function ReservationsTable({ data, isLoading }: ReservationsTableProps) {
  const { user } = useAuth();
  const approveMutation = useApproveReservation();
  const rejectMutation = useRejectReservation();
  const cancelMutation = useCancelReservation();

  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const columns: DataTableColumn<Reservation>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (row) => RESOURCE_TYPE_LABELS[row.resourceType],
    },
    {
      id: 'resource',
      header: 'Ressource',
      cell: (row) => (
        <span className="font-medium">{reservationResourceLabel(row)}</span>
      ),
    },
    {
      id: 'user',
      header: 'Demandeur',
      cell: (row) => userDisplayName(row.user),
    },
    {
      id: 'company',
      header: 'Entreprise',
      cell: (row) => row.company?.name ?? '—',
    },
    {
      id: 'direction',
      header: 'Direction',
      cell: (row) => row.direction?.name ?? 'Aucune direction',
    },
    {
      id: 'startAt',
      header: 'Début',
      cell: (row) => formatDateTime(row.startAt),
    },
    {
      id: 'endAt',
      header: 'Fin',
      cell: (row) => formatDateTime(row.endAt),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => {
        if (!user) return null;
        const showApprove = canApproveOrReject(user, row);
        const showCancel = canCancelReservation(user, row);

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/reservations/${row.id}`}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1',
              )}
            >
              <Eye className="size-3.5" />
              Voir
            </Link>
            {showApprove ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setApproveId(row.id)}
                >
                  <Check className="size-3.5" />
                  Approuver
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectId(row.id)}
                >
                  <X className="size-3.5" />
                  Rejeter
                </Button>
              </>
            ) : null}
            {showCancel ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCancelId(row.id)}
              >
                Annuler
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="Aucune réservation"
        emptyDescription="Aucune réservation ne correspond à vos filtres."
      />

      <ConfirmDialog
        open={Boolean(approveId)}
        onOpenChange={(open) => {
          if (!open) setApproveId(null);
        }}
        title="Approuver la réservation"
        description="Confirmez-vous l’approbation de cette demande ?"
        confirmLabel="Approuver"
        loading={approveMutation.isPending}
        onConfirm={() => {
          if (!approveId) return;
          approveMutation.mutate(approveId, {
            onSettled: () => setApproveId(null),
          });
        }}
      />

      <RejectReservationDialog
        open={Boolean(rejectId)}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
        loading={rejectMutation.isPending}
        onConfirm={(rejectionReason) => {
          if (!rejectId) return;
          rejectMutation.mutate(
            { id: rejectId, rejectionReason },
            { onSettled: () => setRejectId(null) },
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelId)}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
        title="Annuler la réservation"
        description="Cette action libère le créneau. Continuer ?"
        confirmLabel="Annuler la réservation"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (!cancelId) return;
          cancelMutation.mutate(cancelId, {
            onSettled: () => setCancelId(null),
          });
        }}
      />
    </>
  );
}

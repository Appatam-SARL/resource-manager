'use client';

import { use } from 'react';
import { Ban, Check, CircleAlert, Clock3, X } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { useReservation, useReservationDecisions } from '@/features/reservations';
import {
  ReservationHistoryPanel,
  ReservationRequestPanel,
  ReservationRequesterPanel,
  ReservationResourcePanel,
  ReservationSlotPanel,
} from '@/features/reservations/components/detail/reservation-detail-sections';
import { formatDateTime, reservationResourceLabel, RESOURCE_TYPE_LABELS } from '@/lib/format';
import { canAccessRoute } from '@/lib/rbac';
import { canApproveOrReject, canCancelReservation } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ReservationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const query = useReservation(id);
  const decisions = useReservationDecisions();

  if (query.isLoading) {
    return <LoadingState label="Chargement de la réservation…" />;
  }

  if (query.isError || !query.data || !user) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundTitle="Réservation introuvable"
        errorTitle="Impossible de charger la réservation"
        backHref="/reservations"
        backLabel="Retour aux réservations"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const reservation = query.data;
  const showDecision = canApproveOrReject(user, reservation);
  const showCancel = canCancelReservation(user, reservation);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/reservations', label: 'Réservations' }}
        title={reservationResourceLabel(reservation)}
        meta={
          <>
            <StatusBadge status={reservation.status} />
            <span>{RESOURCE_TYPE_LABELS[reservation.resourceType]}</span>
            <span aria-hidden>·</span>
            <span>Demandée le {formatDateTime(reservation.createdAt)}</span>
          </>
        }
        actions={
          showCancel ? (
            <Button type="button" variant="outline" onClick={() => decisions.cancel(reservation.id)}>
              <Ban className="size-4" aria-hidden />
              Annuler la réservation
            </Button>
          ) : undefined
        }
      />

      {showDecision ? (
        <section
          aria-label="Décision"
          className="flex flex-col gap-4 rounded-xl bg-warning/[0.06] p-4 ring-1 ring-warning/20 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Clock3 className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Cette demande attend votre décision</p>
              <p className="text-[13px] text-muted-foreground">
                Vérifiez le créneau et la ressource avant d’approuver. Un refus nécessite un motif.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={() => decisions.reject(reservation.id)}>
              <X className="size-4" aria-hidden />
              Refuser
            </Button>
            <Button type="button" onClick={() => decisions.approve(reservation.id)}>
              <Check className="size-4" aria-hidden />
              Approuver
            </Button>
          </div>
        </section>
      ) : null}

      {reservation.status === 'REJECTED' ? (
        <section
          aria-label="Motif du refus"
          className="flex items-start gap-3 rounded-xl bg-destructive/[0.04] p-4 ring-1 ring-destructive/15 sm:p-5"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">Motif du refus</p>
            <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">
              {reservation.rejectionReason || 'Aucun motif renseigné.'}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ReservationSlotPanel reservation={reservation} />
          <ReservationRequestPanel reservation={reservation} />
        </div>
        <div className="space-y-4">
          <ReservationRequesterPanel reservation={reservation} />
          <ReservationResourcePanel reservation={reservation} canOpenResource={canAccessRoute(user.role, reservation.resourceType === 'VEHICLE' ? '/vehicles' : '/rooms')} />
          <ReservationHistoryPanel reservation={reservation} />
        </div>
      </div>

      {decisions.dialogs}
    </div>
  );
}

'use client';

import { use, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RejectReservationDialog,
  useApproveReservation,
  useCancelReservation,
  useRejectReservation,
  useReservation,
} from '@/features/reservations';
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

type PageProps = {
  params: Promise<{ id: string }>;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || '—'}</dd>
    </div>
  );
}

export default function ReservationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const query = useReservation(id);
  const approveMutation = useApproveReservation();
  const rejectMutation = useRejectReservation();
  const cancelMutation = useCancelReservation();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (query.isLoading) {
    return <LoadingState label="Chargement de la réservation…" />;
  }

  if (query.isError || !query.data || !user) {
    return (
      <ErrorState
        title="Réservation introuvable"
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const reservation = query.data;
  const showApprove = canApproveOrReject(user, reservation);
  const showCancel = canCancelReservation(user, reservation);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Détail de la réservation"
        description={reservationResourceLabel(reservation)}
        actions={<StatusBadge status={reservation.status} />}
      />

      {(showApprove || showCancel) && (
        <div className="flex flex-wrap gap-2">
          {showApprove ? (
            <>
              <Button type="button" onClick={() => setApproveOpen(true)}>
                Approuver
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
              >
                Rejeter
              </Button>
            </>
          ) : null}
          {showCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(true)}
            >
              Annuler
            </Button>
          ) : null}
        </div>
      )}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <DetailRow
              label="Type"
              value={
                RESOURCE_TYPE_LABELS[
                  reservation.resourceType as keyof typeof RESOURCE_TYPE_LABELS
                ]
              }
            />
            <DetailRow
              label="Ressource"
              value={reservationResourceLabel(reservation)}
            />
            <DetailRow
              label="Demandeur"
              value={userDisplayName(reservation.user)}
            />
            <DetailRow
              label="Entreprise"
              value={reservation.company?.name}
            />
            <DetailRow
              label="Direction"
              value={reservation.direction?.name ?? 'Aucune direction'}
            />
            <DetailRow
              label="Début"
              value={formatDateTime(reservation.startAt)}
            />
            <DetailRow label="Fin" value={formatDateTime(reservation.endAt)} />
            <DetailRow label="Statut" value={<StatusBadge status={reservation.status} />} />
            <DetailRow
              label="Créée le"
              value={formatDateTime(reservation.createdAt)}
            />
          </dl>
        </CardContent>
      </Card>

      {reservation.resourceType === 'VEHICLE' ? (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Détails véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Destination" value={reservation.destination} />
              <DetailRow
                label="Motif de mission"
                value={reservation.missionReason}
              />
              <DetailRow
                label="Passagers"
                value={reservation.passengerCount}
              />
              <DetailRow label="Commentaire" value={reservation.comment} />
            </dl>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Détails salle</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Objet" value={reservation.meetingSubject} />
              <DetailRow
                label="Participants"
                value={reservation.participantCount}
              />
              <DetailRow label="Commentaire" value={reservation.comment} />
            </dl>
          </CardContent>
        </Card>
      )}

      {reservation.status === 'REJECTED' ? (
        <Card className="rounded-3xl border-destructive/20">
          <CardHeader>
            <CardTitle>Motif de rejet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              {reservation.rejectionReason || '—'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approuver la réservation"
        description="Confirmez-vous l’approbation de cette demande ?"
        confirmLabel="Approuver"
        loading={approveMutation.isPending}
        onConfirm={() => {
          approveMutation.mutate(reservation.id, {
            onSettled: () => {
              setApproveOpen(false);
              void query.refetch();
            },
          });
        }}
      />

      <RejectReservationDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        loading={rejectMutation.isPending}
        onConfirm={(rejectionReason) => {
          rejectMutation.mutate(
            { id: reservation.id, rejectionReason },
            {
              onSettled: () => {
                setRejectOpen(false);
                void query.refetch();
              },
            },
          );
        }}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Annuler la réservation"
        description="Cette action libère le créneau. Continuer ?"
        confirmLabel="Annuler la réservation"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          cancelMutation.mutate(reservation.id, {
            onSettled: () => {
              setCancelOpen(false);
              void query.refetch();
            },
          });
        }}
      />
    </div>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Building2, Mail, Network } from 'lucide-react';
import type { Reservation } from '@resource-manager/types';
import { Panel } from '@/components/shared/panel';
import { ResourceTypeIcon } from '@/components/shared/resource-type-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  buildReservationTimeline,
  formatReservationDuration,
} from '@/features/reservations/lib/reservation-display';
import { formatDateTime, reservationResourceLabel, userDisplayName } from '@/lib/format';
import { cn } from 'cn';

function DetailItem({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('space-y-1', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-line text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function SlotBoundary({ label, value }: { label: string; value: string }) {
  const date = parseISO(value);
  const valid = isValid(date);
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {valid ? format(date, 'HH:mm') : '—'}
      </p>
      <p className="text-sm text-muted-foreground first-letter:uppercase">
        {valid ? format(date, 'EEEE d MMMM yyyy', { locale: fr }) : ''}
      </p>
    </div>
  );
}

export function ReservationSlotPanel({ reservation }: { reservation: Reservation }) {
  return (
    <Panel title="Créneau" description={`Durée : ${formatReservationDuration(reservation.startAt, reservation.endAt)}`}>
      <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
        <SlotBoundary label={reservation.resourceType === 'VEHICLE' ? 'Départ' : 'Début'} value={reservation.startAt} />
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <SlotBoundary label={reservation.resourceType === 'VEHICLE' ? 'Retour' : 'Fin'} value={reservation.endAt} />
      </div>
    </Panel>
  );
}

export function ReservationRequestPanel({ reservation }: { reservation: Reservation }) {
  const isVehicle = reservation.resourceType === 'VEHICLE';
  return (
    <Panel title={isVehicle ? 'Mission' : 'Réunion'}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {isVehicle ? (
          <>
            <DetailItem label="Destination" value={reservation.destination} />
            <DetailItem label="Passagers" value={reservation.passengerCount} />
            <DetailItem label="Motif de la mission" value={reservation.missionReason} wide />
          </>
        ) : (
          <>
            <DetailItem label="Objet" value={reservation.meetingSubject} />
            <DetailItem label="Participants" value={reservation.participantCount} />
          </>
        )}
        <DetailItem label="Commentaire" value={reservation.comment || 'Aucun commentaire'} wide />
      </dl>
    </Panel>
  );
}

export function ReservationRequesterPanel({ reservation }: { reservation: Reservation }) {
  return (
    <Panel title="Demandeur">
      <div className="flex items-center gap-3">
        <UserAvatar firstName={reservation.user?.firstName} lastName={reservation.user?.lastName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{userDisplayName(reservation.user)}</p>
          {reservation.user?.email ? (
            <a
              href={`mailto:${reservation.user.email}`}
              className="flex items-center gap-1.5 truncate text-[13px] text-muted-foreground hover:text-foreground"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden />
              {reservation.user.email}
            </a>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">Entreprise</dt>
          <dd className="truncate text-foreground">{reservation.company?.name ?? '—'}</dd>
        </div>
        {reservation.direction ? (
          <div className="flex items-center gap-2">
            <Network className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Direction</dt>
            <dd className="truncate text-foreground">{reservation.direction.name}</dd>
          </div>
        ) : null}
      </dl>
    </Panel>
  );
}

function capacityLine(reservation: Reservation): string | null {
  if (reservation.resourceType === 'VEHICLE') {
    const seats = reservation.vehicle?.seats;
    if (!seats) return null;
    return `${reservation.passengerCount ?? 0} passager(s) sur ${seats} places`;
  }
  const capacity = reservation.room?.capacity;
  if (!capacity) return null;
  return `${reservation.participantCount ?? 0} participant(s) sur ${capacity} places`;
}

export function ReservationResourcePanel({
  reservation,
  canOpenResource,
}: {
  reservation: Reservation;
  canOpenResource: boolean;
}) {
  const resourceHref =
    reservation.resourceType === 'VEHICLE' && reservation.vehicleId
      ? `/vehicles/${reservation.vehicleId}`
      : reservation.roomId
        ? `/rooms/${reservation.roomId}`
        : null;
  const resourceStatus = reservation.vehicle?.status ?? reservation.room?.status;
  const capacity = capacityLine(reservation);

  return (
    <Panel
      title="Ressource"
      action={
        canOpenResource && resourceHref ? (
          <Link href={resourceHref} className="text-[13px] font-medium text-primary hover:underline">
            Voir la fiche
          </Link>
        ) : undefined
      }
    >
      <div className="flex items-start gap-3">
        <ResourceTypeIcon resourceType={reservation.resourceType} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{reservationResourceLabel(reservation)}</p>
          {reservation.room?.location ? (
            <p className="text-[13px] text-muted-foreground">{reservation.room.location}</p>
          ) : null}
          {capacity ? <p className="text-[13px] text-muted-foreground">{capacity}</p> : null}
          {resourceStatus ? <StatusBadge status={resourceStatus} className="mt-1" /> : null}
        </div>
      </div>
    </Panel>
  );
}

const TIMELINE_DOT: Record<string, string> = {
  done: 'bg-primary',
  current: 'bg-warning ring-4 ring-warning/15',
  danger: 'bg-destructive',
  upcoming: 'bg-border',
};

export function ReservationHistoryPanel({ reservation }: { reservation: Reservation }) {
  const steps = buildReservationTimeline(reservation);
  return (
    <Panel title="Historique">
      <ol className="relative space-y-4">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-3">
            {index < steps.length - 1 ? (
              <span className="absolute top-3 left-[4px] h-[calc(100%+0.25rem)] w-px bg-border" aria-hidden />
            ) : null}
            <span className={cn('relative mt-1.5 size-2.5 shrink-0 rounded-full', TIMELINE_DOT[step.tone])} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.at ? formatDateTime(step.at) : 'Décision attendue'}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

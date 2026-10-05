import { addMinutes, differenceInCalendarDays, differenceInMinutes, format, isSameYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Reservation, ResourceStatus, Role } from '@resource-manager/types';
import { AppError } from '@/lib/errors';
import { parseApiDate } from '@/lib/format';
import { isOpenStatus } from './reservation-list';
import { formatDuration } from './schedule';

export type ReservationPhase = 'upcoming' | 'active' | 'ended';

export type ReservationTiming = {
  phase: ReservationPhase;
  start: Date;
  end: Date;
  durationMinutes: number;
  /** Minutes until the start (upcoming) or until the end (active). */
  minutesLeft: number;
};

/** Temporal UI state only — never a business status. */
export function getReservationTiming(
  reservation: Pick<Reservation, 'startAt' | 'endAt'>,
  now: Date,
): ReservationTiming {
  const start = parseApiDate(reservation.startAt);
  const end = parseApiDate(reservation.endAt);
  const durationMinutes = Math.max(0, differenceInMinutes(end, start));
  if (now < start) {
    return { phase: 'upcoming', start, end, durationMinutes, minutesLeft: Math.ceil((start.getTime() - now.getTime()) / 60_000) };
  }
  if (now < end) {
    return { phase: 'active', start, end, durationMinutes, minutesLeft: Math.ceil((end.getTime() - now.getTime()) / 60_000) };
  }
  return { phase: 'ended', start, end, durationMinutes, minutesLeft: 0 };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Aujourd'hui", "Demain", "Hier", "Lun. 5 oct." or "Lun. 5 oct. 2027". */
export function formatDetailDay(date: Date, now: Date): string {
  const offset = differenceInCalendarDays(date, now);
  if (offset === 0) return "Aujourd'hui";
  if (offset === 1) return 'Demain';
  if (offset === -1) return 'Hier';
  return capitalize(format(date, isSameYear(date, now) ? 'EEE d MMM' : 'EEE d MMM yyyy', { locale: fr }));
}

export function formatRemaining(minutesLeft: number): string {
  if (minutesLeft <= 1) return 'Se termine dans moins d’une minute';
  return `Se termine dans ${formatDuration(minutesLeft)}`;
}

export function formatStartsIn(minutesLeft: number): string {
  if (minutesLeft <= 1) return 'Commence dans moins d’une minute';
  return `Commence dans ${formatDuration(minutesLeft)}`;
}

type Actor = { id: string; role: Role } | null | undefined;

/**
 * UI hint only: the backend re-checks ownership and organisational scope.
 * Managers and admins only see reservations of their scope, hence can act on them.
 */
function canActOnReservation(reservation: Pick<Reservation, 'userId'>, actor: Actor): boolean {
  if (!actor) return false;
  return actor.role !== 'EMPLOYEE' || actor.id === reservation.userId;
}

export function canCancelReservation(reservation: Pick<Reservation, 'status' | 'userId'>, actor: Actor): boolean {
  return isOpenStatus(reservation.status) && canActOnReservation(reservation, actor);
}

export type ExtensionIneligibility = 'status' | 'ended' | 'resource' | 'permission';

function getResourceStatus(reservation: Reservation): ResourceStatus | undefined {
  return reservation.resourceType === 'VEHICLE' ? reservation.vehicle?.status : reservation.room?.status;
}

export function getExtensionIneligibility(
  reservation: Reservation,
  now: Date,
  actor: Actor,
): ExtensionIneligibility | null {
  if (!isOpenStatus(reservation.status)) return 'status';
  if (parseApiDate(reservation.endAt) <= now) return 'ended';
  if (!canActOnReservation(reservation, actor)) return 'permission';
  const resourceStatus = getResourceStatus(reservation);
  if (resourceStatus && resourceStatus !== 'AVAILABLE') return 'resource';
  return null;
}

export const EXTENSION_QUICK_MINUTES = [30, 60, 120] as const;
export const EXTENSION_STEP_MINUTES = 15;
/** Mirrors the backend guard; the API remains the source of truth. */
export const MAX_EXTENSION_MINUTES = 24 * 60;

export function formatQuickExtension(minutes: number): string {
  if (minutes < 60) return `+${minutes} min`;
  const hours = minutes / 60;
  return `+${hours} ${hours > 1 ? 'heures' : 'heure'}`;
}

/** Candidate new ends on a 15-minute grid, strictly after the current end, up to +24 h. */
export function buildExtensionEndOptions(
  currentEnd: Date,
  stepMinutes = EXTENSION_STEP_MINUTES,
  maxMinutes = MAX_EXTENSION_MINUTES,
): Date[] {
  const first = new Date(currentEnd);
  first.setSeconds(0, 0);
  const remainder = first.getMinutes() % stepMinutes;
  let cursor = addMinutes(first, stepMinutes - remainder);
  if (cursor <= currentEnd) cursor = addMinutes(cursor, stepMinutes);
  const limit = addMinutes(currentEnd, maxMinutes);
  const options: Date[] = [];
  while (cursor <= limit) {
    options.push(cursor);
    cursor = addMinutes(cursor, stepMinutes);
  }
  return options;
}

/** "13:00" or "13:00 · Demain" when the new end falls on another day. */
export function formatEndOption(date: Date, currentEnd: Date, now: Date): string {
  const time = format(date, 'HH:mm');
  return differenceInCalendarDays(date, currentEnd) === 0 ? time : `${time} · ${formatDetailDay(date, now)}`;
}

export function formatExtensionDelta(currentEnd: Date, newEnd: Date): string {
  return `+${formatDuration(Math.max(0, differenceInMinutes(newEnd, currentEnd)))}`;
}

export type AvailabilityConflict = { startAt: string; endAt: string };

/**
 * Only uses the conflicts actually returned by GET /reservations/availability.
 * `latestFreeEnd` is the start of the first blocking reservation, when it leaves room to extend.
 */
export function describeExtensionConflict(
  conflicts: AvailabilityConflict[],
  currentEnd: Date,
  now: Date,
): { message: string; latestFreeEnd: Date | null } {
  const firstStart = conflicts
    .map((conflict) => parseApiDate(conflict.startAt))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!firstStart || firstStart <= currentEnd) {
    return { message: 'Une autre réservation occupe déjà la ressource juste après la fin actuelle.', latestFreeEnd: null };
  }
  const day = differenceInCalendarDays(firstStart, currentEnd) === 0 ? '' : ` ${formatDetailDay(firstStart, now).toLowerCase()}`;
  return {
    message: `Une autre réservation commence à ${format(firstStart, 'HH:mm')}${day}.`,
    latestFreeEnd: firstStart,
  };
}

export function getExtendError(error: unknown): { kind: 'conflict' | 'general'; message: string } {
  if (!(error instanceof AppError)) {
    return { kind: 'general', message: 'Impossible de prolonger la réservation. Veuillez réessayer.' };
  }
  switch (error.status) {
    case 409:
      return {
        kind: 'conflict',
        message: 'La ressource n’est plus disponible sur cette période ou la réservation a changé. Choisissez une autre heure de fin.',
      };
    case 401:
      return { kind: 'general', message: 'Votre session a expiré. Veuillez vous reconnecter.' };
    case 403:
      return { kind: 'general', message: 'Vous n’êtes pas autorisé à prolonger cette réservation.' };
    case 404:
      return { kind: 'general', message: 'Cette réservation est introuvable.' };
    default:
      return { kind: 'general', message: error.message };
  }
}

export function getCancelErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    if (error.status === 403) return 'Vous n’êtes pas autorisé à annuler cette réservation.';
    if (error.status === 409) return 'Cette réservation a déjà été traitée.';
    return error.message;
  }
  return 'Impossible d’annuler la réservation. Veuillez réessayer.';
}

export type HistoryTone = 'done' | 'current' | 'danger' | 'muted';

export type HistoryStep = {
  key: string;
  title: string;
  description?: string;
  date?: string;
  tone: HistoryTone;
};

/** Built from real fields only: no invented timestamps for status transitions. */
export function buildReservationHistory(
  reservation: Pick<Reservation, 'status' | 'createdAt' | 'rejectionReason'>,
): HistoryStep[] {
  const created: HistoryStep = {
    key: 'created',
    title: 'Demande envoyée',
    date: reservation.createdAt,
    tone: 'done',
  };
  switch (reservation.status) {
    case 'PENDING':
      return [
        created,
        {
          key: 'pending',
          title: 'En attente de validation',
          description: 'Un responsable doit examiner votre demande.',
          tone: 'current',
        },
      ];
    case 'APPROVED':
      return [created, { key: 'approved', title: 'Demande approuvée', tone: 'done' }];
    case 'COMPLETED':
      return [created, { key: 'completed', title: 'Réservation terminée', tone: 'done' }];
    case 'REJECTED':
      return [
        created,
        {
          key: 'rejected',
          title: 'Demande refusée',
          description: reservation.rejectionReason?.trim() || undefined,
          tone: 'danger',
        },
      ];
    case 'CANCELLED':
      return [created, { key: 'cancelled', title: 'Réservation annulée', tone: 'muted' }];
  }
}

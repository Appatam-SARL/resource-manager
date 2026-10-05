import { differenceInMinutes, format, isSameDay, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Reservation, ReservationStatus } from '@resource-manager/types';

export type ReservationPeriod = { day: string; time: string };

/**
 * Compact period for tables / cards.
 * Same day: { day: "12 oct. 2026", time: "09:00 → 11:00" }.
 * Several days: { day: "12 oct. → 14 oct. 2026", time: "09:00 → 18:00" }.
 */
export function formatReservationPeriod(startAt: string, endAt: string): ReservationPeriod {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  if (!isValid(start) || !isValid(end)) return { day: '—', time: '' };

  const time = `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`;
  if (isSameDay(start, end)) {
    return { day: format(start, 'd MMM yyyy', { locale: fr }), time };
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: fr });
  return { day: `${startLabel} → ${format(end, 'd MMM yyyy', { locale: fr })}`, time };
}

/** "2 h 30", "45 min", "3 j 2 h". */
export function formatReservationDuration(startAt: string, endAt: string): string {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  if (!isValid(start) || !isValid(end)) return '—';
  const minutes = Math.max(0, differenceInMinutes(end, start));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
  if (hours > 0) return rest > 0 ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
  return `${rest} min`;
}

export type ReservationTimelineStep = {
  id: string;
  label: string;
  at: string | null;
  tone: 'done' | 'current' | 'danger' | 'upcoming';
};

const FINAL_STATUS_LABELS: Partial<Record<ReservationStatus, string>> = {
  APPROVED: 'Demande approuvée',
  REJECTED: 'Demande refusée',
  CANCELLED: 'Réservation annulée',
  COMPLETED: 'Réservation terminée',
};

/**
 * History derived only from the reservation itself (no dedicated history endpoint):
 * creation, then the current decision (dated by `updatedAt`), then the pending step if any.
 */
export function buildReservationTimeline(
  reservation: Pick<Reservation, 'status' | 'createdAt' | 'updatedAt'>,
): ReservationTimelineStep[] {
  const steps: ReservationTimelineStep[] = [
    { id: 'created', label: 'Demande créée', at: reservation.createdAt, tone: 'done' },
  ];

  if (reservation.status === 'PENDING') {
    steps.push({ id: 'pending', label: 'En attente de validation', at: null, tone: 'current' });
    return steps;
  }

  const label = FINAL_STATUS_LABELS[reservation.status];
  if (label) {
    steps.push({
      id: reservation.status.toLowerCase(),
      label,
      at: reservation.updatedAt,
      tone: reservation.status === 'REJECTED' || reservation.status === 'CANCELLED' ? 'danger' : 'done',
    });
  }
  return steps;
}

import { differenceInMinutes } from 'date-fns';
import type { Reservation, ReservationStatus } from '@resource-manager/types';
import {
  getNextReservation,
  splitBySegment,
  toReservationListItem,
  type ReservationListItem,
} from '@/features/reservations/lib/reservation-list';
import { formatDuration } from '@/features/reservations/lib/schedule';
import { formatRelativeDateTime, parseApiDate } from '@/lib/format';

export function getGreeting(now: Date): string {
  return now.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
}

export const ACTIVITY_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Demande approuvée',
  REJECTED: 'Demande refusée',
  CANCELLED: 'Réservation annulée',
  COMPLETED: 'Réservation terminée',
};

export type HomeHighlight = {
  kind: 'current' | 'next';
  item: ReservationListItem;
  /** Minutes until the end (current) or the start (next). */
  minutes: number;
};

/** "Se termine dans 1 h 20", "Commence dans 45 min", "Dans 3 jours". */
export function formatHighlightCountdown(highlight: HomeHighlight): string {
  const { kind, minutes } = highlight;
  if (kind === 'current') {
    return minutes < 1 ? 'Se termine dans moins d’une minute' : `Se termine dans ${formatDuration(minutes)}`;
  }
  if (minutes < 1) return 'Commence maintenant';
  if (minutes < 24 * 60) return `Commence dans ${formatDuration(minutes)}`;
  const days = Math.round(minutes / (24 * 60));
  return `Dans ${days} jour${days > 1 ? 's' : ''}`;
}

export type HomeActivityItem = {
  id: string;
  item: ReservationListItem;
  statusLabel: string;
  updatedLabel: string;
};

export type HomeOverview = {
  highlight: HomeHighlight | null;
  upcomingCount: number;
  pendingCount: number;
  activity: HomeActivityItem[];
};

/**
 * Personal overview computed from the user's own reservations:
 * the reservation in progress (or the next one), and the most recently updated requests.
 */
export function buildHomeOverview(
  reservations: Reservation[],
  now: Date,
  currentUserId: string | undefined,
  activityLimit = 3,
): HomeOverview {
  const split = splitBySegment(reservations, now);

  let highlight: HomeHighlight | null = null;
  const current = [...split.active].sort(
    (a, b) => parseApiDate(a.endAt).getTime() - parseApiDate(b.endAt).getTime(),
  )[0];
  if (current) {
    highlight = {
      kind: 'current',
      item: toReservationListItem(current, now, currentUserId),
      minutes: Math.max(0, differenceInMinutes(parseApiDate(current.endAt), now)),
    };
  } else {
    const next = getNextReservation(split.upcoming);
    if (next) {
      highlight = {
        kind: 'next',
        item: toReservationListItem(next, now, currentUserId),
        minutes: Math.max(0, differenceInMinutes(parseApiDate(next.startAt), now)),
      };
    }
  }

  const activity = reservations
    .filter((reservation) => reservation.id !== highlight?.item.id)
    .sort((a, b) => parseApiDate(b.updatedAt).getTime() - parseApiDate(a.updatedAt).getTime())
    .slice(0, activityLimit)
    .map((reservation) => ({
      id: reservation.id,
      item: toReservationListItem(reservation, now, currentUserId),
      statusLabel: ACTIVITY_LABELS[reservation.status],
      updatedLabel: formatRelativeDateTime(reservation.updatedAt, now),
    }));

  return {
    highlight,
    upcomingCount: split.upcoming.length + split.active.length,
    pendingCount: reservations.filter(
      (reservation) => reservation.status === 'PENDING' && parseApiDate(reservation.endAt) > now,
    ).length,
    activity,
  };
}

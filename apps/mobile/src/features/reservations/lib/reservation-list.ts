import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfWeek,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Reservation, ReservationStatus } from '@resource-manager/types';
import { parseApiDate } from '@/lib/format';

/** Display-only time buckets — never a business status. */
export type TemporalSegment = 'upcoming' | 'active' | 'history';

const OPEN_STATUSES: ReservationStatus[] = ['PENDING', 'APPROVED'];

export function isOpenStatus(status: ReservationStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** startAt <= now < endAt, whatever the business status. */
export function isInProgress(reservation: Pick<Reservation, 'startAt' | 'endAt'>, now: Date): boolean {
  const start = parseApiDate(reservation.startAt);
  const end = parseApiDate(reservation.endAt);
  return start <= now && now < end;
}

/**
 * Open requests (PENDING / APPROVED) are "upcoming" or "active" depending on time.
 * Everything finished, rejected, cancelled or completed lives in the history.
 */
export function getTemporalSegment(
  reservation: Pick<Reservation, 'startAt' | 'endAt' | 'status'>,
  now: Date,
): TemporalSegment {
  if (!isOpenStatus(reservation.status)) return 'history';
  if (parseApiDate(reservation.endAt) <= now) return 'history';
  return isInProgress(reservation, now) ? 'active' : 'upcoming';
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayPrefix(date: Date, now: Date): string {
  const offset = differenceInCalendarDays(date, now);
  if (offset === 0) return "Aujourd'hui";
  if (offset === 1) return 'Demain';
  if (offset === -1) return 'Hier';
  const pattern = isSameYear(date, now) ? 'EEE d MMM' : 'EEE d MMM yyyy';
  return capitalize(format(date, pattern, { locale: fr }));
}

/** "Aujourd'hui · 09:00 → 11:00", "Lun. 5 oct. · 14:00 → 16:00", "Demain 09:00 → Jeu. 1 oct. 18:00". */
export function formatReservationWhen(startAt: string, endAt: string, now: Date): string {
  const start = parseApiDate(startAt);
  const end = parseApiDate(endAt);
  const startTime = format(start, 'HH:mm');
  const endTime = format(end, 'HH:mm');
  if (isSameDay(start, end)) {
    return `${formatDayPrefix(start, now)} · ${startTime} → ${endTime}`;
  }
  return `${formatDayPrefix(start, now)} ${startTime} → ${formatDayPrefix(end, now)} ${endTime}`;
}

export type ReservationListItem = {
  id: string;
  reservation: Reservation;
  typeLabel: string;
  title: string;
  subtitle: string | null;
  when: string;
  context: { kind: 'destination' | 'subject'; text: string } | null;
  requesterName: string | null;
  inProgress: boolean;
};

export function toReservationListItem(
  reservation: Reservation,
  now: Date,
  currentUserId: string | undefined,
): ReservationListItem {
  const isVehicle = reservation.resourceType === 'VEHICLE';
  const title = isVehicle
    ? reservation.vehicle
      ? `${reservation.vehicle.brand} ${reservation.vehicle.model}`
      : 'Véhicule'
    : (reservation.room?.name ?? 'Salle de réunion');
  const subtitle = isVehicle
    ? (reservation.vehicle?.registrationNumber ?? null)
    : (reservation.room?.location ?? null);
  const contextText = isVehicle ? reservation.destination : reservation.meetingSubject;
  const requester = reservation.user;

  return {
    id: reservation.id,
    reservation,
    typeLabel: isVehicle ? 'Véhicule' : 'Salle',
    title,
    subtitle,
    when: formatReservationWhen(reservation.startAt, reservation.endAt, now),
    context: contextText?.trim()
      ? { kind: isVehicle ? 'destination' : 'subject', text: contextText.trim() }
      : null,
    requesterName:
      requester && requester.id !== currentUserId
        ? `${requester.firstName} ${requester.lastName}`.trim()
        : null,
    inProgress: isOpenStatus(reservation.status) && isInProgress(reservation, now),
  };
}

export type ReservationSection = {
  key: string;
  title: string;
  data: ReservationListItem[];
};

function upcomingGroup(start: Date, now: Date): { key: string; title: string } {
  const offset = differenceInCalendarDays(start, now);
  if (offset <= 0) return { key: 'today', title: "Aujourd'hui" };
  if (offset === 1) return { key: 'tomorrow', title: 'Demain' };
  if (start <= endOfWeek(now, { weekStartsOn: 1 })) return { key: 'this-week', title: 'Cette semaine' };
  const nextWeekEnd = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });
  if (start <= nextWeekEnd) return { key: 'next-week', title: 'Semaine prochaine' };
  return { key: 'later', title: 'Plus tard' };
}

function historyGroup(start: Date, now: Date): { key: string; title: string } {
  if (start > now) return { key: 'closed-future', title: 'Demandes clôturées' };
  if (isSameDay(start, now)) return { key: 'today', title: "Aujourd'hui" };
  if (isSameDay(start, subDays(now, 1))) return { key: 'yesterday', title: 'Hier' };
  if (start >= startOfWeek(now, { weekStartsOn: 1 })) return { key: 'this-week', title: 'Cette semaine' };
  if (isSameMonth(start, now)) return { key: 'this-month', title: 'Plus tôt ce mois-ci' };
  const pattern = isSameYear(start, now) ? 'MMMM' : 'MMMM yyyy';
  return { key: format(start, 'yyyy-MM'), title: capitalize(format(start, pattern, { locale: fr })) };
}

/** Sorted, date-grouped sections for one segment (ascending for upcoming, descending for history). */
export function buildReservationSections(
  items: ReservationListItem[],
  segment: TemporalSegment,
  now: Date,
): ReservationSection[] {
  const sorted = [...items].sort((a, b) => {
    const diff = parseApiDate(a.reservation.startAt).getTime() - parseApiDate(b.reservation.startAt).getTime();
    return segment === 'history' ? -diff : diff;
  });

  if (segment === 'active') {
    return sorted.length > 0 ? [{ key: 'active', title: 'En ce moment', data: sorted }] : [];
  }

  const sections: ReservationSection[] = [];
  for (const item of sorted) {
    const start = parseApiDate(item.reservation.startAt);
    const group = segment === 'upcoming' ? upcomingGroup(start, now) : historyGroup(start, now);
    const last = sections[sections.length - 1];
    if (last && last.key === group.key) {
      last.data.push(item);
    } else {
      sections.push({ ...group, data: [item] });
    }
  }
  return sections;
}

export function splitBySegment(reservations: Reservation[], now: Date): Record<TemporalSegment, Reservation[]> {
  const result: Record<TemporalSegment, Reservation[]> = { upcoming: [], active: [], history: [] };
  for (const reservation of reservations) {
    result[getTemporalSegment(reservation, now)].push(reservation);
  }
  return result;
}

/** Soonest open reservation that has not started yet. */
export function getNextReservation(upcoming: Reservation[]): Reservation | null {
  let next: Reservation | null = null;
  for (const reservation of upcoming) {
    if (!next || parseApiDate(reservation.startAt) < parseApiDate(next.startAt)) {
      next = reservation;
    }
  }
  return next;
}

/**
 * The API sorts by startAt desc: once the last loaded item started more than
 * `lookBackDays` ago, every upcoming / in-progress reservation has been loaded.
 */
export function hasReachedPastBoundary(
  loaded: Pick<Reservation, 'startAt'>[],
  now: Date,
  lookBackDays = 7,
): boolean {
  const last = loaded[loaded.length - 1];
  if (!last) return true;
  return parseApiDate(last.startAt) < subDays(now, lookBackDays);
}

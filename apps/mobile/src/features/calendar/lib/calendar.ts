import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEvent, ReservationStatus, ResourceType } from '@resource-manager/types';
import { parseApiDate } from '@/lib/format';

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * One request per displayed month, covering the full weeks around it.
 * The API treats `endDate` as exclusive (`startAt < endDate`), hence the next midnight.
 */
export function getMonthQueryRange(dateInMonth: Date): { monthKey: string; startDate: string; endDate: string } {
  const start = startOfWeek(startOfMonth(dateInMonth), WEEK_OPTIONS);
  const endExclusive = startOfDay(addDays(endOfWeek(endOfMonth(dateInMonth), WEEK_OPTIONS), 1));
  return {
    monthKey: toMonthKey(dateInMonth),
    startDate: start.toISOString(),
    endDate: endExclusive.toISOString(),
  };
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(startOfDay(date), WEEK_OPTIONS);
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** Monday-based weeks around `center`, used by the swipeable date strip. */
export function buildWeekStarts(center: Date, weeksBefore = 52, weeksAfter = 52): Date[] {
  const first = addWeeks(getWeekStart(center), -weeksBefore);
  return Array.from({ length: weeksBefore + weeksAfter + 1 }, (_, index) => addWeeks(first, index));
}

export function findWeekIndex(weekStarts: Date[], date: Date): number {
  if (weekStarts.length === 0) return -1;
  const index = differenceInCalendarWeeks(date, weekStarts[0], WEEK_OPTIONS);
  return index >= 0 && index < weekStarts.length ? index : -1;
}

/** Weeks (Monday → Sunday) covering the month, for the month picker. */
export function getMonthGrid(dateInMonth: Date): Date[][] {
  const weeks: Date[][] = [];
  let cursor = startOfWeek(startOfMonth(dateInMonth), WEEK_OPTIONS);
  const last = endOfMonth(dateInMonth);
  while (cursor <= last) {
    weeks.push(getWeekDays(cursor));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function formatMonthLabel(date: Date): string {
  return capitalize(format(date, 'MMMM yyyy', { locale: fr }));
}

export function formatWeekdayShort(date: Date): string {
  return capitalize(format(date, 'EEE', { locale: fr }).replace('.', ''));
}

export function formatAgendaDayTitle(day: Date, now: Date): { title: string; subtitle: string } {
  const offset = differenceInCalendarDays(day, now);
  const full = format(day, 'EEEE d MMMM', { locale: fr });
  const title =
    offset === 0 ? "Aujourd'hui" : offset === 1 ? 'Demain' : offset === -1 ? 'Hier' : capitalize(format(day, 'EEEE', { locale: fr }));
  return { title, subtitle: offset >= -1 && offset <= 1 ? capitalize(full) : format(day, 'd MMMM yyyy', { locale: fr }) };
}

export type CalendarFiltersValue = {
  resourceType: ResourceType | null;
  status: ReservationStatus | null;
};

export const DEFAULT_CALENDAR_FILTERS: CalendarFiltersValue = { resourceType: null, status: null };

/** The calendar endpoint only returns these statuses (rejected / cancelled never block a slot). */
export const CALENDAR_STATUSES: ReservationStatus[] = ['PENDING', 'APPROVED', 'COMPLETED'];

export function applyCalendarFilters(events: CalendarEvent[], filters: CalendarFiltersValue): CalendarEvent[] {
  return events.filter(
    (event) =>
      (!filters.resourceType || event.resourceType === filters.resourceType) &&
      (!filters.status || event.status === filters.status),
  );
}

function overlapsDay(event: CalendarEvent, dayStart: Date, dayEnd: Date): boolean {
  return parseApiDate(event.start) < dayEnd && parseApiDate(event.end) > dayStart;
}

/** Number of events touching each day (multi-day reservations count on every day). */
export function countEventsByDay(events: CalendarEvent[], days: Date[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of days) {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    let count = 0;
    for (const event of events) {
      if (overlapsDay(event, dayStart, dayEnd)) count += 1;
    }
    if (count > 0) counts.set(toDayKey(day), count);
  }
  return counts;
}

const OPEN_STATUSES: ReservationStatus[] = ['PENDING', 'APPROVED'];

export type AgendaEventRow = {
  kind: 'event';
  key: string;
  event: CalendarEvent;
  /** Label of the time rail: start time, or 00:00 when it started a previous day. */
  railLabel: string;
  timeRange: string;
  /** "Commencée hier", "Se poursuit demain"… */
  spanNote: string | null;
  inProgress: boolean;
  isNext: boolean;
  minutesLeft: number;
};

export type AgendaNowRow = { kind: 'now'; key: 'now'; label: string };

export type AgendaRow = AgendaEventRow | AgendaNowRow;

function describeSpan(start: Date, end: Date, day: Date, now: Date): string | null {
  const startedBefore = differenceInCalendarDays(start, day) < 0;
  // An end at exactly midnight does not continue on the next day.
  const lastDay = startOfDay(new Date(end.getTime() - 1));
  const continuesAfter = differenceInCalendarDays(lastDay, day) > 0;
  const relative = (date: Date) => {
    const offset = differenceInCalendarDays(date, now);
    if (offset === 0) return "aujourd'hui";
    if (offset === 1) return 'demain';
    if (offset === -1) return 'hier';
    return `le ${format(date, 'EEE d MMM', { locale: fr })}`;
  };
  if (startedBefore && continuesAfter) return `Du ${format(start, 'd MMM', { locale: fr })} au ${format(lastDay, 'd MMM', { locale: fr })}`;
  if (startedBefore) {
    return differenceInCalendarDays(day, start) === 1 ? 'Commencée la veille' : `Commencée ${relative(start)}`;
  }
  if (continuesAfter) {
    return differenceInCalendarDays(lastDay, day) === 1 ? 'Se poursuit le lendemain' : `Se poursuit jusqu'au ${format(lastDay, 'EEE d MMM', { locale: fr })}`;
  }
  return null;
}

/** Agenda rows of one day, sorted by start, with the "now" marker when the day is today. */
export function buildDayAgenda(events: CalendarEvent[], day: Date, now: Date): AgendaRow[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const isToday = isSameDay(day, now);

  const dayEvents = events
    .filter((event) => overlapsDay(event, dayStart, dayEnd))
    .sort((a, b) => parseApiDate(a.start).getTime() - parseApiDate(b.start).getTime());

  let nextAssigned = false;
  const rows: AgendaRow[] = [];
  let nowInserted = false;

  for (const event of dayEvents) {
    const start = parseApiDate(event.start);
    const end = parseApiDate(event.end);
    const open = OPEN_STATUSES.includes(event.status);

    if (isToday && !nowInserted && start > now) {
      rows.push({ kind: 'now', key: 'now', label: `Maintenant · ${format(now, 'HH:mm')}` });
      nowInserted = true;
    }

    const inProgress = open && start <= now && now < end;
    const isNext = isToday && open && !nextAssigned && start > now;
    if (isNext) nextAssigned = true;

    rows.push({
      kind: 'event',
      key: event.id,
      event,
      railLabel: start < dayStart ? '00:00' : format(start, 'HH:mm'),
      timeRange: `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`,
      spanNote: describeSpan(start, end, day, now),
      inProgress,
      isNext,
      minutesLeft: inProgress ? Math.ceil((end.getTime() - now.getTime()) / 60_000) : 0,
    });
  }

  if (isToday && !nowInserted && dayEvents.length > 0) {
    rows.push({ kind: 'now', key: 'now', label: `Maintenant · ${format(now, 'HH:mm')}` });
  }
  return rows;
}

export function summarizeAgenda(rows: AgendaRow[]): string | null {
  const events = rows.filter((row): row is AgendaEventRow => row.kind === 'event');
  if (events.length === 0) return null;
  const active = events.filter((row) => row.inProgress).length;
  const base = `${events.length} réservation${events.length > 1 ? 's' : ''}`;
  return active > 0 ? `${base} · ${active} en cours` : base;
}

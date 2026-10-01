import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEvent } from '@resource-manager/types';

/** Yesterday 00:00 → tomorrow 00:00 (end exclusive): one calendar call gives today and a real comparison. */
export function getTwoDayRange(now: Date): { startDate: string; endDate: string } {
  return {
    startDate: startOfDay(subDays(now, 1)).toISOString(),
    endDate: startOfDay(addDays(now, 1)).toISOString(),
  };
}

function overlapsDay(event: CalendarEvent, dayStart: Date): boolean {
  const dayEnd = addDays(dayStart, 1);
  return parseISO(event.start) < dayEnd && parseISO(event.end) > dayStart;
}

export function splitTodayAndYesterday(
  events: CalendarEvent[],
  now: Date,
): { today: CalendarEvent[]; yesterdayCount: number } {
  const todayStart = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  return {
    today: events
      .filter((event) => overlapsDay(event, todayStart))
      .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()),
    yesterdayCount: events.filter((event) => overlapsDay(event, yesterdayStart)).length,
  };
}

export function formatDayDelta(today: number, yesterday: number): string {
  const delta = today - yesterday;
  if (delta === 0) return 'Autant qu’hier';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} par rapport à hier`;
}

/** "14:00 → 16:00"; open-ended sides when the event spans several days. */
export function formatEventTimeRange(event: Pick<CalendarEvent, 'start' | 'end'>, day: Date): string {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const from = start < dayStart ? 'Veille' : format(start, 'HH:mm');
  const to = end > dayEnd ? 'Lendemain' : format(end, 'HH:mm');
  return `${from} → ${to}`;
}

export function isEventInProgress(event: Pick<CalendarEvent, 'start' | 'end' | 'status'>, now: Date): boolean {
  if (event.status !== 'PENDING' && event.status !== 'APPROVED') return false;
  return parseISO(event.start) <= now && now < parseISO(event.end);
}

export function formatLongDate(now: Date): string {
  const label = format(now, 'EEEE d MMMM', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getGreeting(now: Date): string {
  return now.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
}

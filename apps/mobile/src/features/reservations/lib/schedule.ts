import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export const SLOT_MINUTES = 15;

export type Schedule = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export type ScheduleIssue = 'invalid' | 'order' | 'past';

const TIME_PATTERN = /^\d{2}:\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toTimeKey(date: Date): string {
  return format(date, 'HH:mm');
}

/** Local date from "yyyy-MM-dd" (+ optional "HH:mm"), or null when malformed. */
export function parseDateTime(dateKey: string, time = '00:00'): Date | null {
  if (!DATE_PATTERN.test(dateKey) || !TIME_PATTERN.test(time)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return isValid(date) ? date : null;
}

function roundUpToSlot(date: Date, slotMinutes: number): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % slotMinutes;
  return remainder === 0 ? rounded : addMinutes(rounded, slotMinutes - remainder);
}

function scheduleFrom(start: Date, durationMinutes: number): Schedule {
  const end = addMinutes(start, durationMinutes);
  return {
    startDate: toDateKey(start),
    startTime: toTimeKey(start),
    endDate: toDateKey(end),
    endTime: toTimeKey(end),
  };
}

/** Next half-hour slot today, or tomorrow 09:00 when the day is almost over. */
export function getDefaultSchedule(now: Date, durationMinutes: number): Schedule {
  const nextSlot = roundUpToSlot(addMinutes(now, 5), 30);
  const lastSameDayStart = parseDateTime(toDateKey(now), '21:00');
  const start =
    lastSameDayStart && nextSlot <= lastSameDayStart
      ? nextSlot
      : (parseDateTime(toDateKey(addDays(now, 1)), '09:00') ?? nextSlot);
  return scheduleFrom(start, durationMinutes);
}

export function getScheduleDurationMinutes(schedule: Schedule): number | null {
  const start = parseDateTime(schedule.startDate, schedule.startTime);
  const end = parseDateTime(schedule.endDate, schedule.endTime);
  if (!start || !end) return null;
  return differenceInMinutes(end, start);
}

/** Moves the start while keeping the current duration (or `fallbackMinutes` if invalid). */
export function moveScheduleStart(
  schedule: Schedule,
  startDate: string,
  startTime: string,
  fallbackMinutes: number,
): Schedule {
  const start = parseDateTime(startDate, startTime);
  if (!start) return { ...schedule, startDate, startTime };
  const duration = getScheduleDurationMinutes(schedule);
  return scheduleFrom(start, duration && duration > 0 ? duration : fallbackMinutes);
}

export function getScheduleIssue(schedule: Schedule, now: Date): ScheduleIssue | null {
  const start = parseDateTime(schedule.startDate, schedule.startTime);
  const end = parseDateTime(schedule.endDate, schedule.endTime);
  if (!start || !end) return 'invalid';
  if (!(start < end)) return 'order';
  if (start.getTime() < now.getTime() - 60_000) return 'past';
  return null;
}

export const SCHEDULE_ISSUE_MESSAGES: Record<ScheduleIssue, string> = {
  invalid: 'Choisissez une date et des horaires valides.',
  order: 'L’heure de fin doit être postérieure à l’heure de début.',
  past: 'Le début de la réservation est déjà passé. Choisissez un horaire à venir.',
};

export function buildTimeSlots(slotMinutes = SLOT_MINUTES): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += slotMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** { relative: "Aujourd'hui" | "Demain" | "Mercredi", full: "28 septembre 2026" } */
export function formatDayLabel(dateKey: string, now: Date): { relative: string; full: string } {
  const date = parseDateTime(dateKey);
  if (!date) return { relative: '—', full: '' };
  const offset = differenceInCalendarDays(date, now);
  const relative =
    offset === 0
      ? "Aujourd'hui"
      : offset === 1
        ? 'Demain'
        : capitalize(format(date, 'EEEE', { locale: fr }));
  return { relative, full: format(date, 'd MMMM yyyy', { locale: fr }) };
}

export function formatShortDay(dateKey: string): string {
  const date = parseDateTime(dateKey);
  return date ? capitalize(format(date, 'EEE d MMM', { locale: fr })) : '—';
}

/** "45 min", "2 h", "2 h 30", "1 j 3 h", "1 j 3 h 15 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const rest = minutes % 60;
  if (days === 0) {
    return rest > 0 ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
  }
  return [`${days} j`, hours > 0 ? `${hours} h` : null, rest > 0 ? `${rest} min` : null]
    .filter(Boolean)
    .join(' ');
}

/** "Lun. 28 sept. · 09:00 → 11:00" or "Lun. 28 sept. 09:00 → Mar. 29 sept. 12:00". */
export function formatScheduleRange(schedule: Schedule): string {
  if (schedule.startDate === schedule.endDate) {
    return `${formatShortDay(schedule.startDate)} · ${schedule.startTime} → ${schedule.endTime}`;
  }
  return `${formatShortDay(schedule.startDate)} ${schedule.startTime} → ${formatShortDay(schedule.endDate)} ${schedule.endTime}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

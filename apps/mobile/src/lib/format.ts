import {
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

const TIMEZONE = 'Africa/Abidjan';

export function parseApiDate(value: string): Date {
  return parseISO(value);
}

export function formatDate(value: string): string {
  return format(parseApiDate(value), 'dd MMM yyyy', { locale: fr });
}

export function formatTime(value: string): string {
  return format(parseApiDate(value), 'HH:mm', { locale: fr });
}

export function formatDateTime(value: string): string {
  return format(parseApiDate(value), "dd MMM yyyy 'à' HH:mm", { locale: fr });
}

/** "À l'instant", "Il y a 10 min", "Il y a 3 h", "Hier à 14:05", "12 sept. à 09:30". */
export function formatRelativeDateTime(value: string, now: Date = new Date()): string {
  const date = parseApiDate(value);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (isSameDay(date, now)) return `Il y a ${Math.floor(minutes / 60)} h`;
  if (isSameDay(date, subDays(now, 1))) {
    return `Hier à ${format(date, 'HH:mm', { locale: fr })}`;
  }
  return format(date, "d MMM 'à' HH:mm", { locale: fr });
}

/** Section title used to group items by day: "Aujourd'hui", "Hier", "lundi 22 septembre". */
export function formatDayGroupLabel(value: string, now: Date = new Date()): string {
  const date = parseApiDate(value);
  if (isSameDay(date, now)) return "Aujourd'hui";
  if (isSameDay(date, subDays(now, 1))) return 'Hier';
  const label = format(date, 'EEEE d MMMM', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string,
  now: Date = new Date(),
): { title: string; data: T[] }[] {
  const sections: { title: string; data: T[] }[] = [];
  for (const item of items) {
    const title = formatDayGroupLabel(getDate(item), now);
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.data.push(item);
    } else {
      sections.push({ title, data: [item] });
    }
  }
  return sections;
}

export function toIsoDateTime(date: Date): string {
  return date.toISOString();
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm — interpreted as local then ISO
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.toISOString();
}

export { TIMEZONE };

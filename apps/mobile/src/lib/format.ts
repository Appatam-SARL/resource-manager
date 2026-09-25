import { format, parseISO } from 'date-fns';
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

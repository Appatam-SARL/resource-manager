import type { Notification } from '@resource-manager/types';
import { format, isSameDay, isSameYear, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  CircleX,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@/lib/status';

type NotificationTypeConfig = { icon: LucideIcon; tone: StatusTone; label: string };

const TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  RESERVATION_CREATED: { icon: CalendarPlus, tone: 'info', label: 'Nouvelle demande' },
  RESERVATION_APPROVED: { icon: CircleCheck, tone: 'success', label: 'Approuvée' },
  RESERVATION_REJECTED: { icon: CircleX, tone: 'danger', label: 'Refusée' },
  RESERVATION_CANCELLED: { icon: Ban, tone: 'neutral', label: 'Annulée' },
  RESERVATION_EXTENDED: { icon: CalendarClock, tone: 'warning', label: 'Prolongée' },
};

const FALLBACK_CONFIG: NotificationTypeConfig = { icon: Bell, tone: 'neutral', label: 'Notification' };

export function getNotificationTypeConfig(type: string): NotificationTypeConfig {
  return TYPE_CONFIG[type] ?? FALLBACK_CONFIG;
}

/** Admin page the notification refers to, if any. */
export function notificationHref(notification: Pick<Notification, 'entityType' | 'entityId'>): string | null {
  if (notification.entityType === 'Reservation' && notification.entityId) {
    return `/reservations/${notification.entityId}`;
  }
  return null;
}

export type NotificationDayGroup = { key: string; label: string; items: Notification[] };

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Aujourd’hui';
  if (isSameDay(date, subDays(now, 1))) return 'Hier';
  const label = format(date, isSameYear(date, now) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy', { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Groups notifications (already sorted newest first by the API) by calendar day, keeping order. */
export function groupNotificationsByDay(notifications: Notification[], now: Date = new Date()): NotificationDayGroup[] {
  const groups: NotificationDayGroup[] = [];
  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    const key = format(startOfDay(date), 'yyyy-MM-dd');
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(notification);
    } else {
      groups.push({ key, label: dayLabel(date, now), items: [notification] });
    }
  }
  return groups;
}

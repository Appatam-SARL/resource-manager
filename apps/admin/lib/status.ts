import type { LucideIcon } from 'lucide-react';
import {
  Ban,
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock3,
  Wrench,
} from 'lucide-react';
import type { ReservationStatus, ResourceStatus } from '@resource-manager/types';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type EntityStatus = 'ACTIVE' | 'INACTIVE';

export type KnownStatus = ReservationStatus | ResourceStatus | EntityStatus;

export type StatusConfig = {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
};

/** Single source of truth for status labels, tones and icons (same vocabulary as the mobile app). */
export const STATUS_CONFIG: Record<KnownStatus, StatusConfig> = {
  PENDING: { label: 'En attente', tone: 'warning', icon: Clock3 },
  APPROVED: { label: 'Approuvée', tone: 'success', icon: CircleCheck },
  COMPLETED: { label: 'Terminée', tone: 'neutral', icon: CheckCheck },
  REJECTED: { label: 'Refusée', tone: 'danger', icon: CircleX },
  CANCELLED: { label: 'Annulée', tone: 'neutral', icon: Ban },
  AVAILABLE: { label: 'Disponible', tone: 'success', icon: CircleCheck },
  MAINTENANCE: { label: 'Maintenance', tone: 'warning', icon: Wrench },
  OUT_OF_SERVICE: { label: 'Hors service', tone: 'danger', icon: CircleX },
  ACTIVE: { label: 'Actif', tone: 'success', icon: CircleCheck },
  INACTIVE: { label: 'Inactif', tone: 'neutral', icon: CircleDashed },
};

export const STATUS_TONE_CLASSES: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-success/10 text-success ring-success/20', dot: 'bg-success' },
  warning: { badge: 'bg-warning/10 text-warning ring-warning/20', dot: 'bg-warning' },
  danger: { badge: 'bg-destructive/10 text-destructive ring-destructive/20', dot: 'bg-destructive' },
  neutral: { badge: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground/60' },
  info: { badge: 'bg-info/10 text-info ring-info/20', dot: 'bg-info' },
};

/**
 * Status shown to the user. An APPROVED reservation whose end is reached reads
 * as COMPLETED right away, without waiting for the server job that persists it.
 * Every other status (PENDING included) is shown as-is.
 */
export function getDisplayStatus(
  reservation: { status: ReservationStatus; endAt: string },
  now: Date,
): ReservationStatus {
  if (reservation.status === 'APPROVED' && new Date(reservation.endAt) <= now) {
    return 'COMPLETED';
  }
  return reservation.status;
}

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status as KnownStatus] ?? {
      label: status,
      tone: 'neutral',
      icon: CircleDashed,
    }
  );
}

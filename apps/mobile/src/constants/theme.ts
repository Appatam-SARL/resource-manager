import type { ReservationStatus, ResourceStatus, Role } from '@resource-manager/types';

export const colors = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  primaryMuted: '#D8F3DC',
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#2D6A4F',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  GROUP_ADMIN: 'Admin Groupe',
  COMPANY_ADMIN: 'Admin Entreprise',
  MANAGER: 'Manager',
  EMPLOYEE: 'Collaborateur',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Hors service',
};

export function statusColor(status: ReservationStatus | ResourceStatus): string {
  switch (status) {
    case 'APPROVED':
    case 'AVAILABLE':
    case 'COMPLETED':
      return colors.success;
    case 'PENDING':
    case 'MAINTENANCE':
      return colors.warning;
    case 'REJECTED':
    case 'CANCELLED':
    case 'OUT_OF_SERVICE':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

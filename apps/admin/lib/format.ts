import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  AuditAction,
  ResourceStatus,
  ReservationStatus,
  ResourceType,
  Role,
} from '@resource-manager/types';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, 'dd MMM yyyy HH:mm', { locale: fr });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseISO(value);
  if (!isValid(date)) return value;
  return format(date, 'dd MMM yyyy', { locale: fr });
}

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Hors service',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  VEHICLE: 'Véhicule',
  ROOM: 'Salle',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  STATUS_CHANGE: 'Changement de statut',
  APPROVE: 'Approbation',
  REJECT: 'Rejet',
  CANCEL: 'Annulation',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
};

export function dashboardSubtitle(role: Role): string {
  switch (role) {
    case 'GROUP_ADMIN':
      return 'Vue d’ensemble du Groupe';
    case 'COMPANY_ADMIN':
      return 'Vue d’ensemble de votre entreprise';
    case 'MANAGER':
      return 'Vue d’ensemble de votre périmètre';
    case 'EMPLOYEE':
      return 'Votre activité personnelle';
    default:
      return 'Tableau de bord';
  }
}

export function reservationResourceLabel(reservation: {
  resourceType: ResourceType;
  vehicle?: { registrationNumber: string; brand: string; model: string } | null;
  room?: { name: string } | null;
}): string {
  if (reservation.resourceType === 'VEHICLE' && reservation.vehicle) {
    return `${reservation.vehicle.registrationNumber} — ${reservation.vehicle.brand} ${reservation.vehicle.model}`;
  }
  if (reservation.resourceType === 'ROOM' && reservation.room) {
    return reservation.room.name;
  }
  return RESOURCE_TYPE_LABELS[reservation.resourceType];
}

export function userDisplayName(user?: {
  firstName: string;
  lastName: string;
} | null): string {
  if (!user) return '—';
  return `${user.firstName} ${user.lastName}`.trim();
}

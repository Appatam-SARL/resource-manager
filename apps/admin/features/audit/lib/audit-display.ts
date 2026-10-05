import type { AuditAction, AuditLog, Role } from '@resource-manager/types';
import { AUDIT_ACTION_LABELS, RESOURCE_TYPE_LABELS, formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/rbac';
import { getStatusConfig, type StatusTone } from '@/lib/status';

/** Entities written by the API (`AuditService.log`). */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Reservation: 'Réservation',
  Vehicle: 'Véhicule',
  MeetingRoom: 'Salle',
  User: 'Utilisateur',
  Company: 'Entreprise',
  Direction: 'Direction',
  Group: 'Groupe',
};

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  Reservation: (id) => `/reservations/${id}`,
  Vehicle: (id) => `/vehicles/${id}`,
  MeetingRoom: (id) => `/rooms/${id}`,
  User: (id) => `/users/${id}`,
  Company: (id) => `/companies/${id}`,
  Direction: (id) => `/directions/${id}`,
  Group: () => '/group',
};

const ACTION_TONES: Record<AuditAction, StatusTone> = {
  CREATE: 'info',
  UPDATE: 'neutral',
  DELETE: 'danger',
  STATUS_CHANGE: 'warning',
  APPROVE: 'success',
  REJECT: 'danger',
  CANCEL: 'neutral',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  code: 'Code',
  description: 'Description',
  registrationNumber: 'Immatriculation',
  brand: 'Marque',
  model: 'Modèle',
  seats: 'Places',
  capacity: 'Capacité',
  location: 'Emplacement',
  email: 'E-mail',
  firstName: 'Prénom',
  lastName: 'Nom',
  role: 'Rôle',
  status: 'Statut',
  from: 'Ancien statut',
  to: 'Nouveau statut',
  previousStatus: 'Statut précédent',
  rejectionReason: 'Motif du refus',
  resourceType: 'Type de ressource',
  startAt: 'Début',
  endAt: 'Fin',
  previousEndAt: 'Ancienne fin',
  newEndAt: 'Nouvelle fin',
  purpose: 'Objet',
  destination: 'Destination',
  passengerCount: 'Passagers',
  participantCount: 'Participants',
  comment: 'Commentaire',
  reason: 'Raison',
  operation: 'Opération',
};

/** Technical keys never shown to the reader (identifiers, timestamps, nested objects). */
const HIDDEN_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'passwordHash', 'before', 'after']);

const VALUE_LABELS: Record<string, string> = {
  soft_deactivate_has_reservations: 'Mise hors service automatique (réservations existantes)',
  EXTEND: 'Prolongation',
};

export type AuditDetailEntry = { key: string; label: string; value: string };
export type AuditChange = { key: string; label: string; before: string; after: string };

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action;
}

export function auditActionTone(action: string): StatusTone {
  return ACTION_TONES[action as AuditAction] ?? 'neutral';
}

/** Link to the audited element — none for deletions (the element no longer exists). */
export function auditEntityHref(log: Pick<AuditLog, 'entity' | 'entityId' | 'action'>): string | null {
  if (log.action === 'DELETE') return null;
  const route = ENTITY_ROUTES[log.entity];
  if (!route) return null;
  if (log.entity === 'Group') return route('');
  return log.entityId ? route(log.entityId) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVisibleKey(key: string): boolean {
  return !HIDDEN_KEYS.has(key) && !key.endsWith('Id');
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Human readable value: statuses, roles and dates are translated; objects are not displayed. */
export function formatAuditValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  if (key === 'role' && value in ROLE_LABELS) return ROLE_LABELS[value as Role];
  if (key === 'resourceType' && value in RESOURCE_TYPE_LABELS) {
    return RESOURCE_TYPE_LABELS[value as keyof typeof RESOURCE_TYPE_LABELS];
  }
  if (['status', 'from', 'to', 'previousStatus'].includes(key)) return getStatusConfig(value).label;
  if (ISO_DATE.test(value)) return formatDateTime(value);
  return VALUE_LABELS[value] ?? value;
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** Fields actually changed by an update logged as `{ before, after }`. */
export function auditChanges(metadata: AuditLog['metadata']): AuditChange[] {
  if (!metadata || !isRecord(metadata.before) || !isRecord(metadata.after)) return [];
  const before = metadata.before;
  const changes: AuditChange[] = [];
  for (const [key, afterValue] of Object.entries(metadata.after)) {
    if (!isVisibleKey(key) || afterValue === undefined) continue;
    const beforeValue = before[key];
    if (JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)) continue;
    const formattedAfter = formatAuditValue(key, afterValue);
    const formattedBefore = formatAuditValue(key, beforeValue);
    if (formattedAfter === null || formattedBefore === null) continue;
    changes.push({ key, label: fieldLabel(key), before: formattedBefore, after: formattedAfter });
  }
  return changes;
}

/** Flat metadata (excluding identifiers and before/after snapshots) as label / value pairs. */
export function auditDetailEntries(metadata: AuditLog['metadata']): AuditDetailEntry[] {
  if (!metadata) return [];
  const entries: AuditDetailEntry[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (!isVisibleKey(key)) continue;
    const formatted = formatAuditValue(key, value);
    if (formatted === null) continue;
    entries.push({ key, label: fieldLabel(key), value: formatted });
  }
  return entries;
}

function isSnapshotUpdate(metadata: AuditLog['metadata']): boolean {
  return Boolean(metadata && isRecord(metadata.before) && isRecord(metadata.after));
}

/** One-line summary shown in the audit list. */
export function summarizeAuditLog(log: Pick<AuditLog, 'action' | 'metadata'>): string | null {
  const metadata = log.metadata ?? {};

  if (typeof metadata.from === 'string' && typeof metadata.to === 'string') {
    return `${getStatusConfig(metadata.from).label} → ${getStatusConfig(metadata.to).label}`;
  }
  if (log.action === 'STATUS_CHANGE' && typeof metadata.status === 'string') {
    return `Nouveau statut : ${getStatusConfig(metadata.status).label}`;
  }
  if (log.action === 'REJECT' && typeof metadata.rejectionReason === 'string') {
    return `Motif : ${metadata.rejectionReason}`;
  }
  if (log.action === 'CANCEL' && typeof metadata.previousStatus === 'string') {
    return `Était ${getStatusConfig(metadata.previousStatus).label.toLowerCase()}`;
  }
  if (metadata.operation === 'EXTEND' && typeof metadata.newEndAt === 'string') {
    return `Prolongée jusqu’au ${formatDateTime(metadata.newEndAt)}`;
  }
  if (isSnapshotUpdate(log.metadata)) {
    const changes = auditChanges(log.metadata);
    if (changes.length === 0) return 'Aucun champ modifié';
    return `Modifié : ${changes.map((change) => change.label.toLowerCase()).join(', ')}`;
  }
  if (typeof metadata.registrationNumber === 'string') return metadata.registrationNumber;
  if (typeof metadata.email === 'string') {
    const role = typeof metadata.role === 'string' ? formatAuditValue('role', metadata.role) : null;
    return role ? `${metadata.email} · ${role}` : metadata.email;
  }
  if (typeof metadata.name === 'string') {
    return typeof metadata.code === 'string' && metadata.code ? `${metadata.name} (${metadata.code})` : metadata.name;
  }
  if (typeof metadata.resourceType === 'string') {
    return `Ressource : ${formatAuditValue('resourceType', metadata.resourceType)}`;
  }
  return null;
}

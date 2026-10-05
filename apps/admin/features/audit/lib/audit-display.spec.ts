import { describe, expect, it } from 'vitest';
import {
  auditChanges,
  auditDetailEntries,
  auditEntityHref,
  auditEntityLabel,
  summarizeAuditLog,
} from './audit-display';

describe('auditEntityHref', () => {
  it('links to the detail page of the audited element', () => {
    expect(auditEntityHref({ entity: 'Reservation', entityId: 'r1', action: 'APPROVE' })).toBe('/reservations/r1');
    expect(auditEntityHref({ entity: 'MeetingRoom', entityId: 'm1', action: 'UPDATE' })).toBe('/rooms/m1');
    expect(auditEntityHref({ entity: 'Group', entityId: 'g1', action: 'UPDATE' })).toBe('/group');
  });

  it('gives no link for deletions or unknown entities', () => {
    expect(auditEntityHref({ entity: 'Vehicle', entityId: 'v1', action: 'DELETE' })).toBeNull();
    expect(auditEntityHref({ entity: 'Unknown', entityId: 'x', action: 'UPDATE' })).toBeNull();
  });
});

describe('auditEntityLabel', () => {
  it('translates known entities and keeps the others', () => {
    expect(auditEntityLabel('MeetingRoom')).toBe('Salle');
    expect(auditEntityLabel('Other')).toBe('Other');
  });
});

describe('summarizeAuditLog', () => {
  it('describes a status transition', () => {
    expect(summarizeAuditLog({ action: 'STATUS_CHANGE', metadata: { from: 'MAINTENANCE', to: 'AVAILABLE' } })).toBe(
      'Maintenance → Disponible',
    );
  });

  it('describes a user status change', () => {
    expect(summarizeAuditLog({ action: 'STATUS_CHANGE', metadata: { status: 'INACTIVE' } })).toBe('Nouveau statut : Inactif');
  });

  it('shows the rejection reason and the previous status of a cancellation', () => {
    expect(summarizeAuditLog({ action: 'REJECT', metadata: { companyId: 'c', rejectionReason: 'Véhicule indisponible' } })).toBe(
      'Motif : Véhicule indisponible',
    );
    expect(summarizeAuditLog({ action: 'CANCEL', metadata: { companyId: 'c', previousStatus: 'APPROVED' } })).toBe(
      'Était approuvée',
    );
  });

  it('lists the fields changed by an update, ignoring identifiers and timestamps', () => {
    expect(
      summarizeAuditLog({
        action: 'UPDATE',
        metadata: {
          before: { id: 'm1', name: 'Salle B', capacity: 8, updatedAt: '2026-09-25T10:00:00.000Z' },
          after: { name: 'Salle B', capacity: 10 },
        },
      }),
    ).toBe('Modifié : capacité');
  });

  it('says so when an update changed nothing', () => {
    expect(
      summarizeAuditLog({ action: 'UPDATE', metadata: { before: { name: 'A' }, after: { name: 'A' } } }),
    ).toBe('Aucun champ modifié');
  });

  it('summarises creations with their business identifier', () => {
    expect(summarizeAuditLog({ action: 'CREATE', metadata: { email: 'a@b.dev', role: 'MANAGER' } })).toBe('a@b.dev · Manager');
    expect(summarizeAuditLog({ action: 'CREATE', metadata: { name: 'Djela', code: 'DJE' } })).toBe('Djela (DJE)');
    expect(summarizeAuditLog({ action: 'CREATE', metadata: { companyId: 'c', vehicleId: 'v', resourceType: 'VEHICLE' } })    ).toBe(
      'Ressource : Véhicule',
    );
  });

  it('returns null when there is nothing meaningful to show', () => {
    expect(summarizeAuditLog({ action: 'APPROVE', metadata: { companyId: 'c' } })).toBeNull();
    expect(summarizeAuditLog({ action: 'APPROVE', metadata: null })).toBeNull();
  });
});

describe('auditChanges', () => {
  it('returns translated before / after values', () => {
    expect(
      auditChanges({ before: { status: 'AVAILABLE', seats: 5 }, after: { status: 'MAINTENANCE', seats: 5 } }),
    ).toEqual([{ key: 'status', label: 'Statut', before: 'Disponible', after: 'Maintenance' }]);
  });

  it('ignores metadata without snapshots', () => {
    expect(auditChanges({ name: 'A' })).toEqual([]);
  });
});

describe('auditDetailEntries', () => {
  it('hides identifiers and snapshots, translates known values', () => {
    expect(
      auditDetailEntries({
        companyId: 'c1',
        reason: 'soft_deactivate_has_reservations',
        to: 'OUT_OF_SERVICE',
        before: { name: 'A' },
      }),
    ).toEqual([
      { key: 'reason', label: 'Raison', value: 'Mise hors service automatique (réservations existantes)' },
      { key: 'to', label: 'Nouveau statut', value: 'Hors service' },
    ]);
  });
});

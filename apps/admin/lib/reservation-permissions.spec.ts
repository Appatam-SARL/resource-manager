import { describe, expect, it } from 'vitest';
import type { AuthUser, Reservation, Role } from '@resource-manager/types';
import { canCancelReservation } from '@/lib/reservation-permissions';

const now = new Date('2026-10-12T10:00:00.000Z');

function makeUser(id: string, role: Role): AuthUser {
  return {
    id,
    email: `${id}@appatam.dev`,
    firstName: 'Jean',
    lastName: 'Dupont',
    role,
    status: 'ACTIVE',
    companyId: 'company-a',
    directionId: null,
    company: { id: 'company-a', name: 'Appatam' },
    direction: null,
  };
}

function makeReservation(startAt: string, endAt: string): Reservation {
  return {
    id: 'res-1',
    companyId: 'company-a',
    userId: 'owner',
    directionId: null,
    resourceType: 'ROOM',
    vehicleId: null,
    roomId: 'room-1',
    startAt,
    endAt,
    destination: null,
    missionReason: null,
    passengerCount: null,
    meetingSubject: 'Point hebdo',
    participantCount: 4,
    comment: null,
    status: 'APPROVED',
    rejectionReason: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
}

const upcoming = makeReservation('2026-10-12T11:00:00.000Z', '2026-10-12T12:00:00.000Z');
const inProgress = makeReservation('2026-10-12T09:00:00.000Z', '2026-10-12T11:00:00.000Z');
const finished = makeReservation('2026-10-12T07:00:00.000Z', '2026-10-12T08:00:00.000Z');

describe('canCancelReservation', () => {
  it('autorise l’annulation d’une réservation qui n’a pas commencé', () => {
    expect(canCancelReservation(makeUser('owner', 'EMPLOYEE'), upcoming, now)).toBe(true);
    expect(canCancelReservation(makeUser('admin', 'COMPANY_ADMIN'), upcoming, now)).toBe(true);
  });

  it('refuse une réservation en cours ou terminée, quel que soit le rôle', () => {
    for (const role of ['EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN', 'GROUP_ADMIN'] as const) {
      const user = makeUser(role === 'EMPLOYEE' ? 'owner' : role.toLowerCase(), role);
      expect(canCancelReservation(user, inProgress, now)).toBe(false);
      expect(canCancelReservation(user, finished, now)).toBe(false);
    }
  });

  it('refuse une réservation dont l’heure de début est exactement atteinte', () => {
    const startingNow = makeReservation(now.toISOString(), '2026-10-12T11:00:00.000Z');
    expect(canCancelReservation(makeUser('owner', 'EMPLOYEE'), startingNow, now)).toBe(false);
  });
});

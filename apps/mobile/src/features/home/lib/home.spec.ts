import { describe, expect, it } from 'vitest';
import type { Reservation } from '@resource-manager/types';
import { buildHomeOverview, formatHighlightCountdown, getGreeting, type HomeHighlight } from './home';

// Monday 28 September 2026, 10:00 local time.
const now = new Date(2026, 8, 28, 10, 0);

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 8, day, hour, minute).toISOString();
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r1',
    companyId: 'c1',
    userId: 'u1',
    directionId: null,
    resourceType: 'VEHICLE',
    vehicleId: 'v1',
    roomId: null,
    startAt: at(29, 9),
    endAt: at(29, 11),
    destination: 'Cocody',
    missionReason: 'Visite client',
    passengerCount: 2,
    meetingSubject: null,
    participantCount: null,
    comment: null,
    status: 'APPROVED',
    rejectionReason: null,
    createdAt: at(20, 9),
    updatedAt: at(20, 9),
    vehicle: { id: 'v1', registrationNumber: 'AB-1234-AA', brand: 'Toyota', model: 'Corolla' },
    room: null,
    user: { id: 'u1', firstName: 'Koné', lastName: 'Nonwa' },
    ...overrides,
  };
}

describe('getGreeting', () => {
  it('switches to Bonsoir from 18:00', () => {
    expect(getGreeting(new Date(2026, 8, 28, 9))).toBe('Bonjour');
    expect(getGreeting(new Date(2026, 8, 28, 18))).toBe('Bonsoir');
  });
});

describe('formatHighlightCountdown', () => {
  it('describes the remaining or waiting time', () => {
    expect(formatHighlightCountdown({ kind: 'current', minutes: 80 } as HomeHighlight)).toBe('Se termine dans 1 h 20');
    expect(formatHighlightCountdown({ kind: 'next', minutes: 45 } as HomeHighlight)).toBe('Commence dans 45 min');
    expect(formatHighlightCountdown({ kind: 'next', minutes: 0 } as HomeHighlight)).toBe('Commence maintenant');
    expect(formatHighlightCountdown({ kind: 'next', minutes: 3 * 24 * 60 + 100 } as HomeHighlight)).toBe('Dans 3 jours');
  });
});

describe('buildHomeOverview', () => {
  it('returns an empty overview without reservations', () => {
    expect(buildHomeOverview([], now, 'u1')).toEqual({
      highlight: null,
      upcomingCount: 0,
      pendingCount: 0,
      activity: [],
    });
  });

  it('prefers the reservation in progress over the next one', () => {
    const overview = buildHomeOverview(
      [
        makeReservation({ id: 'next', startAt: at(28, 14), endAt: at(28, 16) }),
        makeReservation({ id: 'current', startAt: at(28, 9), endAt: at(28, 11, 30) }),
      ],
      now,
      'u1',
    );
    expect(overview.highlight?.kind).toBe('current');
    expect(overview.highlight?.item.id).toBe('current');
    expect(overview.highlight?.minutes).toBe(90);
    expect(overview.upcomingCount).toBe(2);
  });

  it('picks the soonest open upcoming reservation', () => {
    const overview = buildHomeOverview(
      [
        makeReservation({ id: 'later', startAt: at(30, 9), endAt: at(30, 10) }),
        makeReservation({ id: 'soon', startAt: at(28, 12), endAt: at(28, 13), status: 'PENDING' }),
        makeReservation({ id: 'cancelled', startAt: at(28, 11), endAt: at(28, 12), status: 'CANCELLED' }),
      ],
      now,
      'u1',
    );
    expect(overview.highlight).toMatchObject({ kind: 'next', minutes: 120 });
    expect(overview.highlight?.item.id).toBe('soon');
    expect(overview.pendingCount).toBe(1);
  });

  it('never highlights a cancelled reservation in progress', () => {
    const overview = buildHomeOverview(
      [makeReservation({ startAt: at(28, 9), endAt: at(28, 11), status: 'CANCELLED' })],
      now,
      'u1',
    );
    expect(overview.highlight).toBeNull();
  });

  it('lists the most recently updated requests, excluding the highlighted one', () => {
    const overview = buildHomeOverview(
      [
        makeReservation({ id: 'hero', startAt: at(28, 12), endAt: at(28, 13), updatedAt: at(28, 9, 50) }),
        makeReservation({ id: 'old', startAt: at(20, 9), endAt: at(20, 10), status: 'COMPLETED', updatedAt: at(20, 11) }),
        makeReservation({ id: 'rejected', startAt: at(27, 9), endAt: at(27, 10), status: 'REJECTED', updatedAt: at(27, 8) }),
        makeReservation({ id: 'approved', startAt: at(29, 9), endAt: at(29, 10), updatedAt: at(28, 9) }),
      ],
      now,
      'u1',
      2,
    );
    expect(overview.activity.map((entry) => entry.id)).toEqual(['approved', 'rejected']);
    expect(overview.activity[0].statusLabel).toBe('Demande approuvée');
    expect(overview.activity[0].updatedLabel).toBe('Il y a 1 h');
    expect(overview.activity[1].statusLabel).toBe('Demande refusée');
  });

  it('does not count a past pending request as pending', () => {
    const overview = buildHomeOverview(
      [makeReservation({ startAt: at(27, 9), endAt: at(27, 10), status: 'PENDING' })],
      now,
      'u1',
    );
    expect(overview.pendingCount).toBe(0);
  });
});

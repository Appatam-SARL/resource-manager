import { describe, expect, it } from 'vitest';
import type { Reservation, ReservationStatus } from '@resource-manager/types';
import {
  buildReservationSections,
  formatReservationWhen,
  getNextReservation,
  getTemporalSegment,
  hasReachedPastBoundary,
  splitBySegment,
  toReservationListItem,
} from './reservation-list';

// Monday 28 September 2026, 10:00 local time.
const now = new Date(2026, 8, 28, 10, 0);

function at(day: number, hour: number, month = 8): string {
  return new Date(2026, month, day, hour, 0).toISOString();
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

describe('getTemporalSegment', () => {
  it('classifies open reservations by time', () => {
    expect(getTemporalSegment(makeReservation(), now)).toBe('upcoming');
    expect(getTemporalSegment(makeReservation({ startAt: at(28, 9), endAt: at(28, 11) }), now)).toBe('active');
    expect(getTemporalSegment(makeReservation({ startAt: at(27, 9), endAt: at(27, 11) }), now)).toBe('history');
  });

  it('puts closed statuses in the history whatever the date', () => {
    const closed: ReservationStatus[] = ['REJECTED', 'CANCELLED', 'COMPLETED'];
    for (const status of closed) {
      expect(getTemporalSegment(makeReservation({ status }), now)).toBe('history');
    }
  });

  it('keeps a pending request in progress as active without changing its status', () => {
    const reservation = makeReservation({ status: 'PENDING', startAt: at(28, 9), endAt: at(28, 12) });
    expect(getTemporalSegment(reservation, now)).toBe('active');
    expect(toReservationListItem(reservation, now, 'u1').inProgress).toBe(true);
    expect(reservation.status).toBe('PENDING');
  });
});

describe('formatReservationWhen', () => {
  it('uses relative days for close dates', () => {
    expect(formatReservationWhen(at(28, 14), at(28, 16), now)).toBe("Aujourd'hui · 14:00 → 16:00");
    expect(formatReservationWhen(at(29, 9), at(29, 11), now)).toBe('Demain · 09:00 → 11:00');
    expect(formatReservationWhen(at(27, 9), at(27, 11), now)).toBe('Hier · 09:00 → 11:00');
  });

  it('uses a short date otherwise and handles multi-day slots', () => {
    expect(formatReservationWhen(at(5, 14, 9), at(5, 16, 9), now)).toBe('Lun. 5 oct. · 14:00 → 16:00');
    expect(formatReservationWhen(at(29, 9), at(1, 18, 9), now)).toBe('Demain 09:00 → Jeu. 1 oct. 18:00');
  });
});

describe('toReservationListItem', () => {
  it('shows vehicle identity and destination', () => {
    const item = toReservationListItem(makeReservation(), now, 'u1');
    expect(item).toMatchObject({
      typeLabel: 'Véhicule',
      title: 'Toyota Corolla',
      subtitle: 'AB-1234-AA',
      context: { kind: 'destination', text: 'Cocody' },
      requesterName: null,
    });
  });

  it('shows room location and meeting subject, never a destination', () => {
    const item = toReservationListItem(
      makeReservation({
        resourceType: 'ROOM',
        vehicleId: null,
        vehicle: null,
        roomId: 'room1',
        room: { id: 'room1', name: 'Salle Conseil', location: null },
        destination: 'ignored',
        meetingSubject: 'Réunion commerciale',
      }),
      now,
      'u1',
    );
    expect(item).toMatchObject({
      typeLabel: 'Salle',
      title: 'Salle Conseil',
      subtitle: null,
      context: { kind: 'subject', text: 'Réunion commerciale' },
    });
  });

  it('names the requester only when it is someone else', () => {
    expect(toReservationListItem(makeReservation(), now, 'other').requesterName).toBe('Koné Nonwa');
  });
});

describe('buildReservationSections', () => {
  const items = [
    makeReservation({ id: 'later', startAt: at(20, 9, 9), endAt: at(20, 10, 9) }),
    makeReservation({ id: 'today', startAt: at(28, 14), endAt: at(28, 15) }),
    makeReservation({ id: 'tomorrow', startAt: at(29, 9), endAt: at(29, 10) }),
    makeReservation({ id: 'week', startAt: at(2, 9, 9), endAt: at(2, 10, 9) }),
    makeReservation({ id: 'next-week', startAt: at(7, 9, 9), endAt: at(7, 10, 9) }),
  ].map((r) => toReservationListItem(r, now, 'u1'));

  it('groups upcoming reservations in chronological order', () => {
    const sections = buildReservationSections(items, 'upcoming', now);
    expect(sections.map((s) => s.title)).toEqual([
      "Aujourd'hui",
      'Demain',
      'Cette semaine',
      'Semaine prochaine',
      'Plus tard',
    ]);
    expect(sections.flatMap((s) => s.data.map((d) => d.id))).toEqual([
      'today',
      'tomorrow',
      'week',
      'next-week',
      'later',
    ]);
  });

  it('groups the history from the most recent', () => {
    const history = [
      makeReservation({ id: 'yesterday', startAt: at(27, 9), endAt: at(27, 10) }),
      makeReservation({ id: 'august', startAt: at(10, 9, 7), endAt: at(10, 10, 7) }),
      makeReservation({ id: 'month', startAt: at(3, 9), endAt: at(3, 10) }),
      makeReservation({ id: 'cancelled', status: 'CANCELLED', startAt: at(30, 9), endAt: at(30, 10) }),
    ].map((r) => toReservationListItem(r, now, 'u1'));
    expect(buildReservationSections(history, 'history', now).map((s) => s.title)).toEqual([
      'Demandes clôturées',
      'Hier',
      'Plus tôt ce mois-ci',
      'Août',
    ]);
  });
});

describe('helpers', () => {
  it('splits and finds the next reservation', () => {
    const reservations = [
      makeReservation({ id: 'far', startAt: at(10, 9, 9), endAt: at(10, 10, 9) }),
      makeReservation({ id: 'soon', startAt: at(28, 15), endAt: at(28, 16) }),
      makeReservation({ id: 'now', startAt: at(28, 9), endAt: at(28, 12) }),
      makeReservation({ id: 'done', status: 'COMPLETED', startAt: at(20, 9), endAt: at(20, 10) }),
    ];
    const split = splitBySegment(reservations, now);
    expect(split.upcoming.map((r) => r.id)).toEqual(['far', 'soon']);
    expect(split.active.map((r) => r.id)).toEqual(['now']);
    expect(split.history.map((r) => r.id)).toEqual(['done']);
    expect(getNextReservation(split.upcoming)?.id).toBe('soon');
    expect(getNextReservation([])).toBeNull();
  });

  it('detects when paging has gone far enough into the past', () => {
    expect(hasReachedPastBoundary([], now)).toBe(true);
    expect(hasReachedPastBoundary([{ startAt: at(27, 9) }], now)).toBe(false);
    expect(hasReachedPastBoundary([{ startAt: at(10, 9) }], now)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type { Reservation } from '@resource-manager/types';
import { AppError } from '@/lib/errors';
import {
  buildExtensionEndOptions,
  buildReservationHistory,
  canCancelReservation,
  describeExtensionConflict,
  formatEndOption,
  formatExtensionDelta,
  formatQuickExtension,
  formatRemaining,
  getExtendError,
  getExtensionIneligibility,
  getReservationTiming,
} from './reservation-detail';

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
    startAt: at(28, 9),
    endAt: at(28, 11),
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
    vehicle: { id: 'v1', registrationNumber: 'AB-1234-AA', brand: 'Toyota', model: 'Corolla', status: 'AVAILABLE' },
    room: null,
    ...overrides,
  };
}

const owner = { id: 'u1', role: 'EMPLOYEE' as const };
const colleague = { id: 'u2', role: 'EMPLOYEE' as const };
const manager = { id: 'm1', role: 'MANAGER' as const };

describe('getReservationTiming', () => {
  it('detects an active reservation and the remaining time', () => {
    const timing = getReservationTiming(makeReservation(), now);
    expect(timing.phase).toBe('active');
    expect(timing.durationMinutes).toBe(120);
    expect(timing.minutesLeft).toBe(60);
    expect(formatRemaining(timing.minutesLeft)).toBe('Se termine dans 1 h');
  });

  it('detects upcoming and ended reservations', () => {
    expect(getReservationTiming(makeReservation({ startAt: at(28, 12), endAt: at(28, 13) }), now).phase).toBe('upcoming');
    expect(getReservationTiming(makeReservation({ startAt: at(28, 7), endAt: at(28, 8) }), now).phase).toBe('ended');
  });
});

describe('getExtensionIneligibility', () => {
  it('allows the owner of an open, not finished reservation', () => {
    expect(getExtensionIneligibility(makeReservation(), now, owner)).toBeNull();
    expect(getExtensionIneligibility(makeReservation({ status: 'PENDING' }), now, owner)).toBeNull();
  });

  it('refuses closed, finished, foreign or unavailable-resource reservations', () => {
    expect(getExtensionIneligibility(makeReservation({ status: 'CANCELLED' }), now, owner)).toBe('status');
    expect(getExtensionIneligibility(makeReservation({ status: 'COMPLETED' }), now, owner)).toBe('status');
    expect(getExtensionIneligibility(makeReservation({ endAt: at(28, 9, 30) }), now, owner)).toBe('ended');
    expect(getExtensionIneligibility(makeReservation(), now, colleague)).toBe('permission');
    expect(
      getExtensionIneligibility(
        makeReservation({
          vehicle: { id: 'v1', registrationNumber: 'X', brand: 'T', model: 'C', status: 'MAINTENANCE' },
        }),
        now,
        owner,
      ),
    ).toBe('resource');
  });

  it('lets managers act within their visible scope (backend re-checks)', () => {
    expect(getExtensionIneligibility(makeReservation(), now, manager)).toBeNull();
    expect(canCancelReservation(makeReservation(), manager)).toBe(true);
    expect(canCancelReservation(makeReservation(), colleague)).toBe(false);
  });
});

describe('extension options', () => {
  it('starts strictly after the current end on a 15-minute grid, up to +24 h', () => {
    const currentEnd = new Date(2026, 8, 28, 11, 0);
    const options = buildExtensionEndOptions(currentEnd);
    expect(options[0]).toEqual(new Date(2026, 8, 28, 11, 15));
    expect(options).toHaveLength(96);
    expect(options[options.length - 1]).toEqual(new Date(2026, 8, 29, 11, 0));
  });

  it('rounds an off-grid end up to the next slot', () => {
    const options = buildExtensionEndOptions(new Date(2026, 8, 28, 11, 7));
    expect(options[0]).toEqual(new Date(2026, 8, 28, 11, 15));
  });

  it('formats options, deltas and quick choices', () => {
    const currentEnd = new Date(2026, 8, 28, 23, 0);
    expect(formatEndOption(new Date(2026, 8, 28, 23, 30), currentEnd, now)).toBe('23:30');
    expect(formatEndOption(new Date(2026, 8, 29, 0, 30), currentEnd, now)).toBe('00:30 · Demain');
    expect(formatExtensionDelta(currentEnd, new Date(2026, 8, 29, 0, 30))).toBe('+1 h 30');
    expect(formatQuickExtension(30)).toBe('+30 min');
    expect(formatQuickExtension(60)).toBe('+1 heure');
    expect(formatQuickExtension(120)).toBe('+2 heures');
  });
});

describe('describeExtensionConflict', () => {
  const currentEnd = new Date(2026, 8, 28, 11, 0);

  it('reports the first real conflicting start and the latest free end', () => {
    const result = describeExtensionConflict(
      [
        { startAt: at(28, 13), endAt: at(28, 14) },
        { startAt: at(28, 12, 30), endAt: at(28, 13) },
      ],
      currentEnd,
      now,
    );
    expect(result.message).toBe('Une autre réservation commence à 12:30.');
    expect(result.latestFreeEnd).toEqual(new Date(2026, 8, 28, 12, 30));
  });

  it('offers no shortcut when the resource is taken right after the end', () => {
    const result = describeExtensionConflict([{ startAt: at(28, 11), endAt: at(28, 12) }], currentEnd, now);
    expect(result.latestFreeEnd).toBeNull();
  });
});

describe('errors and history', () => {
  it('maps API errors without exposing technical details', () => {
    expect(getExtendError(new AppError('conflit', 409)).kind).toBe('conflict');
    expect(getExtendError(new AppError('x', 403)).message).toBe(
      'Vous n’êtes pas autorisé à prolonger cette réservation.',
    );
    expect(getExtendError(new Error('socket hang up')).message).toBe(
      'Impossible de prolonger la réservation. Veuillez réessayer.',
    );
  });

  it('builds the history from real fields only', () => {
    expect(buildReservationHistory(makeReservation({ status: 'PENDING' })).map((s) => s.key)).toEqual([
      'created',
      'pending',
    ]);
    const rejected = buildReservationHistory(
      makeReservation({ status: 'REJECTED', rejectionReason: ' Véhicule en révision ' }),
    );
    expect(rejected[1]).toMatchObject({ title: 'Demande refusée', description: 'Véhicule en révision' });
  });
});

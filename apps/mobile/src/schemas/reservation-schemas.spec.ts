import { describe, expect, it } from 'vitest';
import {
  validatePassengerCountAgainstSeats,
  vehicleReservationSchema,
} from './vehicle-reservation-schema';
import {
  roomReservationSchema,
  validateParticipantCountAgainstCapacity,
} from './room-reservation-schema';

describe('vehicleReservationSchema', () => {
  const valid = {
    vehicleId: 'veh-1',
    startDate: '2026-10-01',
    startTime: '09:00',
    endDate: '2026-10-01',
    endTime: '12:00',
    destination: 'Abidjan',
    missionReason: 'Réunion client',
    passengerCount: 2,
  };

  it('accepte une réservation véhicule valide', () => {
    expect(vehicleReservationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette quand la fin est avant le début', () => {
    const result = vehicleReservationSchema.safeParse({
      ...valid,
      endTime: '08:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejette un nombre de passagers non positif', () => {
    const result = vehicleReservationSchema.safeParse({
      ...valid,
      passengerCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('signale un dépassement de places', () => {
    expect(validatePassengerCountAgainstSeats(5, 4)).toMatch(/places/);
    expect(validatePassengerCountAgainstSeats(2, 4)).toBeNull();
  });
});

describe('roomReservationSchema', () => {
  const valid = {
    roomId: 'room-1',
    startDate: '2026-10-01',
    startTime: '10:00',
    endDate: '2026-10-01',
    endTime: '11:00',
    meetingSubject: 'Stand-up',
    participantCount: 4,
  };

  it('accepte une réservation salle valide', () => {
    expect(roomReservationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette start >= end', () => {
    const result = roomReservationSchema.safeParse({
      ...valid,
      endTime: '10:00',
    });
    expect(result.success).toBe(false);
  });

  it('signale un dépassement de capacité', () => {
    expect(validateParticipantCountAgainstCapacity(12, 10)).toMatch(/participants/);
    expect(validateParticipantCountAgainstCapacity(5, 10)).toBeNull();
  });
});

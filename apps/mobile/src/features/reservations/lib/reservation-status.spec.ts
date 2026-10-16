import { describe, expect, it } from 'vitest';
import type { ReservationStatus } from '@resource-manager/types';
import { getDisplayStatus } from './reservation-status';

const now = new Date('2026-10-06T10:00:00.000Z');

function make(status: ReservationStatus, endAt: string) {
  return { status, endAt };
}

describe('getDisplayStatus', () => {
  it('shows an ended APPROVED reservation as COMPLETED', () => {
    expect(getDisplayStatus(make('APPROVED', '2026-10-06T09:00:00.000Z'), now)).toBe('COMPLETED');
  });

  it('treats an end exactly now as reached', () => {
    expect(getDisplayStatus(make('APPROVED', '2026-10-06T10:00:00.000Z'), now)).toBe('COMPLETED');
  });

  it('keeps an in-progress or future APPROVED reservation APPROVED', () => {
    expect(getDisplayStatus(make('APPROVED', '2026-10-06T11:00:00.000Z'), now)).toBe('APPROVED');
  });

  it('keeps an ended PENDING reservation PENDING', () => {
    expect(getDisplayStatus(make('PENDING', '2026-10-06T09:00:00.000Z'), now)).toBe('PENDING');
  });

  it('never changes final statuses', () => {
    for (const status of ['REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      expect(getDisplayStatus(make(status, '2026-10-06T09:00:00.000Z'), now)).toBe(status);
    }
  });
});

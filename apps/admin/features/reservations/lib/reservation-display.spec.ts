import { describe, expect, it } from 'vitest';
import {
  buildReservationTimeline,
  formatReservationDuration,
  formatReservationPeriod,
} from './reservation-display';

function local(year: number, month: number, day: number, hours = 0, minutes = 0): string {
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

describe('formatReservationPeriod', () => {
  it('formats a same-day reservation', () => {
    expect(formatReservationPeriod(local(2026, 10, 12, 9), local(2026, 10, 12, 11, 30))).toEqual({
      day: '12 oct. 2026',
      time: '09:00 → 11:30',
    });
  });

  it('formats a multi-day reservation', () => {
    expect(formatReservationPeriod(local(2026, 10, 12, 9), local(2026, 10, 14, 18))).toEqual({
      day: '12 oct. → 14 oct. 2026',
      time: '09:00 → 18:00',
    });
  });

  it('handles invalid dates', () => {
    expect(formatReservationPeriod('invalid', 'invalid').day).toBe('—');
  });
});

describe('formatReservationDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatReservationDuration(local(2026, 1, 1, 9), local(2026, 1, 1, 9, 45))).toBe('45 min');
    expect(formatReservationDuration(local(2026, 1, 1, 9), local(2026, 1, 1, 11, 30))).toBe('2 h 30');
    expect(formatReservationDuration(local(2026, 1, 1, 9), local(2026, 1, 1, 11))).toBe('2 h');
    expect(formatReservationDuration(local(2026, 1, 1, 9), local(2026, 1, 3, 11))).toBe('2 j 2 h');
  });
});

describe('buildReservationTimeline', () => {
  const base = { createdAt: local(2026, 1, 1, 8), updatedAt: local(2026, 1, 1, 10) };

  it('shows the pending step for a pending reservation', () => {
    const steps = buildReservationTimeline({ ...base, status: 'PENDING' });
    expect(steps.map((step) => step.id)).toEqual(['created', 'pending']);
    expect(steps[1]?.at).toBeNull();
  });

  it('dates the decision with updatedAt', () => {
    const steps = buildReservationTimeline({ ...base, status: 'REJECTED' });
    expect(steps[1]).toMatchObject({ label: 'Demande refusée', at: base.updatedAt, tone: 'danger' });
  });
});

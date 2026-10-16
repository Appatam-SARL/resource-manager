import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@resource-manager/types';
import {
  formatAverageDuration,
  formatDayDelta,
  formatEventTimeRange,
  formatRoomUsageHint,
  formatUsageDirectionLabel,
  getTwoDayRange,
  isEventInProgress,
  splitTodayAndYesterday,
  usageSharePercent,
} from './dashboard';

describe('room usage by direction', () => {
  const entry = {
    directionId: 'dir-tech',
    directionName: 'Direction Technique',
    companyId: 'company-a',
    companyName: 'Appatam',
    reservationCount: 4,
    totalMinutes: 240,
  };

  it('labels directions, with the company in the group view', () => {
    expect(formatUsageDirectionLabel(entry, false)).toBe('Direction Technique');
    expect(formatUsageDirectionLabel(entry, true)).toBe('Direction Technique · Appatam');
    expect(formatUsageDirectionLabel({ ...entry, directionId: null, directionName: null }, false)).toBe(
      'Appatam · sans direction',
    );
  });

  it('computes the share of booked time', () => {
    expect(usageSharePercent(240, 720)).toBe(33);
    expect(usageSharePercent(0, 0)).toBe(0);
  });
});

describe('formatAverageDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatAverageDuration(45)).toBe('45 min');
    expect(formatAverageDuration(65)).toBe('1 h 05');
    expect(formatAverageDuration(120)).toBe('2 h');
    expect(formatAverageDuration(1440 + 180)).toBe('1 j 3 h');
  });
});

describe('formatRoomUsageHint', () => {
  const base = { averageMinutes: 75, reservationCount: 12, periodDays: 30 };

  it('shows the trend versus the previous period', () => {
    expect(formatRoomUsageHint({ ...base, previous: { averageMinutes: 60, reservationCount: 8 } })).toBe(
      '12 réunions · 30 j · +15 min vs période préc.',
    );
    expect(formatRoomUsageHint({ ...base, previous: { averageMinutes: 90, reservationCount: 8 } })).toBe(
      '12 réunions · 30 j · −15 min vs période préc.',
    );
    expect(formatRoomUsageHint({ ...base, previous: { averageMinutes: 75, reservationCount: 3 } })).toBe(
      '12 réunions · 30 j · stable',
    );
  });

  it('handles a missing previous period or no meeting at all', () => {
    expect(
      formatRoomUsageHint({ ...base, reservationCount: 1, previous: { averageMinutes: null, reservationCount: 0 } }),
    ).toBe('1 réunion · 30 j');
    expect(
      formatRoomUsageHint({
        averageMinutes: null,
        reservationCount: 0,
        periodDays: 30,
        previous: { averageMinutes: null, reservationCount: 0 },
      }),
    ).toBe('Aucune réunion terminée sur 30 jours');
  });
});

// Tuesday 29 September 2026, 10:00 local time.
const now = new Date(2026, 8, 29, 10, 0);

function at(day: number, hour: number): string {
  return new Date(2026, 8, day, hour, 0).toISOString();
}

function event(id: string, start: string, end: string, status: CalendarEvent['status'] = 'APPROVED'): CalendarEvent {
  return { id, title: id, start, end, status, resourceType: 'VEHICLE', resourceId: 'v1' } as CalendarEvent;
}

describe('dashboard lib', () => {
  it('requests yesterday and today with an exclusive end', () => {
    expect(getTwoDayRange(now)).toEqual({
      startDate: new Date(2026, 8, 28).toISOString(),
      endDate: new Date(2026, 8, 30).toISOString(),
    });
  });

  it('splits events by day, counting multi-day events on both days', () => {
    const result = splitTodayAndYesterday(
      [
        event('late', at(29, 14), at(29, 16)),
        event('early', at(29, 8), at(29, 9)),
        event('yesterday', at(28, 9), at(28, 10)),
        event('overnight', at(28, 20), at(29, 8)),
      ],
      now,
    );
    expect(result.today.map((item) => item.id)).toEqual(['overnight', 'early', 'late']);
    expect(result.yesterdayCount).toBe(2);
  });

  it('describes the day-over-day delta', () => {
    expect(formatDayDelta(5, 2)).toBe('+3 par rapport à hier');
    expect(formatDayDelta(1, 3)).toBe('−2 par rapport à hier');
    expect(formatDayDelta(2, 2)).toBe('Autant qu’hier');
  });

  it('formats time ranges with open ends for multi-day events', () => {
    expect(formatEventTimeRange(event('a', at(29, 14), at(29, 16)), now)).toBe('14:00 → 16:00');
    expect(formatEventTimeRange(event('b', at(28, 20), at(30, 8)), now)).toBe('Veille → Lendemain');
  });

  it('flags only open reservations in progress', () => {
    expect(isEventInProgress(event('a', at(29, 9), at(29, 11)), now)).toBe(true);
    expect(isEventInProgress(event('b', at(29, 9), at(29, 11), 'COMPLETED'), now)).toBe(false);
    expect(isEventInProgress(event('c', at(29, 11), at(29, 12)), now)).toBe(false);
  });
});

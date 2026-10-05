import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@resource-manager/types';
import {
  formatDayDelta,
  formatEventTimeRange,
  getTwoDayRange,
  isEventInProgress,
  splitTodayAndYesterday,
} from './dashboard';

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

import { describe, expect, it } from 'vitest';
import {
  buildTimeSlots,
  formatDayLabel,
  formatDuration,
  formatScheduleRange,
  getDefaultSchedule,
  getScheduleDurationMinutes,
  getScheduleIssue,
  moveScheduleStart,
  pluralize,
} from './schedule';

const now = new Date(2026, 8, 28, 13, 10);

describe('getDefaultSchedule', () => {
  it('starts at the next half-hour slot today', () => {
    expect(getDefaultSchedule(now, 60)).toEqual({
      startDate: '2026-09-28',
      startTime: '13:30',
      endDate: '2026-09-28',
      endTime: '14:30',
    });
  });

  it('moves to tomorrow 09:00 late in the evening', () => {
    expect(getDefaultSchedule(new Date(2026, 8, 28, 22, 40), 180)).toEqual({
      startDate: '2026-09-29',
      startTime: '09:00',
      endDate: '2026-09-29',
      endTime: '12:00',
    });
  });

  it('lets a long slot end on the next day', () => {
    const schedule = getDefaultSchedule(new Date(2026, 8, 28, 20, 50), 180);
    expect(schedule.startTime).toBe('21:00');
    expect(schedule.endDate).toBe('2026-09-29');
    expect(schedule.endTime).toBe('00:00');
  });
});

describe('getScheduleIssue', () => {
  const base = { startDate: '2026-09-28', startTime: '14:00', endDate: '2026-09-28', endTime: '16:00' };

  it('accepts a valid upcoming slot', () => {
    expect(getScheduleIssue(base, now)).toBeNull();
  });

  it('rejects an end before or equal to the start', () => {
    expect(getScheduleIssue({ ...base, endTime: '14:00' }, now)).toBe('order');
    expect(getScheduleIssue({ ...base, endTime: '09:00' }, now)).toBe('order');
  });

  it('rejects a start in the past', () => {
    expect(getScheduleIssue({ ...base, startTime: '10:00' }, now)).toBe('past');
  });

  it('rejects malformed values', () => {
    expect(getScheduleIssue({ ...base, startTime: '9h' }, now)).toBe('invalid');
  });
});

describe('moveScheduleStart', () => {
  it('keeps the current duration when the start moves', () => {
    const moved = moveScheduleStart(
      { startDate: '2026-09-28', startTime: '09:00', endDate: '2026-09-28', endTime: '11:30' },
      '2026-09-30',
      '15:00',
      60,
    );
    expect(moved).toEqual({
      startDate: '2026-09-30',
      startTime: '15:00',
      endDate: '2026-09-30',
      endTime: '17:30',
    });
    expect(getScheduleDurationMinutes(moved)).toBe(150);
  });

  it('uses the fallback duration when the current one is invalid', () => {
    const moved = moveScheduleStart(
      { startDate: '2026-09-28', startTime: '12:00', endDate: '2026-09-28', endTime: '10:00' },
      '2026-09-28',
      '14:00',
      60,
    );
    expect(moved.endTime).toBe('15:00');
  });
});

describe('formatting', () => {
  it('formats relative day labels in French', () => {
    expect(formatDayLabel('2026-09-28', now)).toEqual({
      relative: "Aujourd'hui",
      full: '28 septembre 2026',
    });
    expect(formatDayLabel('2026-09-29', now).relative).toBe('Demain');
    expect(formatDayLabel('2026-10-01', now).relative).toBe('Jeudi');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(150)).toBe('2 h 30');
    expect(formatDuration(27 * 60)).toBe('1 j 3 h');
  });

  it('formats same-day and multi-day ranges', () => {
    expect(
      formatScheduleRange({
        startDate: '2026-09-28',
        startTime: '09:00',
        endDate: '2026-09-28',
        endTime: '11:00',
      }),
    ).toBe('Lun. 28 sept. · 09:00 → 11:00');
    expect(
      formatScheduleRange({
        startDate: '2026-09-28',
        startTime: '09:00',
        endDate: '2026-09-29',
        endTime: '12:00',
      }),
    ).toBe('Lun. 28 sept. 09:00 → Mar. 29 sept. 12:00');
  });

  it('builds 15-minute slots for a whole day', () => {
    const slots = buildTimeSlots();
    expect(slots).toHaveLength(96);
    expect(slots[0]).toBe('00:00');
    expect(slots[37]).toBe('09:15');
    expect(slots.at(-1)).toBe('23:45');
  });

  it('pluralizes counts', () => {
    expect(pluralize(1, 'passager', 'passagers')).toBe('1 passager');
    expect(pluralize(3, 'passager', 'passagers')).toBe('3 passagers');
  });
});

import { describe, expect, it } from 'vitest';
import { computeRoomUsageStats, roomUsageWindowStart, type DirectionUsageInterval } from './room-usage.js';

const now = new Date('2026-10-13T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const TECH = { id: 'dir-tech', name: 'Direction Technique' };
const SALES = { id: 'dir-sales', name: 'Direction Commerciale' };

function meeting(
  endDaysAgo: number,
  minutes: number,
  direction: { id: string; name: string } | null = TECH,
  company = { id: 'company-a', name: 'Appatam' },
): DirectionUsageInterval {
  const endAt = new Date(now.getTime() - endDaysAgo * DAY);
  return {
    startAt: new Date(endAt.getTime() - minutes * 60_000),
    endAt,
    companyId: company.id,
    company: { name: company.name },
    direction,
  };
}

describe('computeRoomUsageStats', () => {
  it('averages the duration of meetings ended in the last 30 days', () => {
    const stats = computeRoomUsageStats([meeting(1, 60), meeting(5, 90), meeting(29, 30)], now);

    expect(stats).toMatchObject({ averageMinutes: 60, reservationCount: 3, periodDays: 30, totalMinutes: 180 });
  });

  it('compares with the previous 30 days and ignores older or unfinished meetings', () => {
    const ongoing = {
      ...meeting(0, 60),
      startAt: new Date(now.getTime() - 30 * 60_000),
      endAt: new Date(now.getTime() + 30 * 60_000),
    };
    const stats = computeRoomUsageStats(
      [meeting(2, 45), meeting(40, 120), meeting(59, 60), meeting(61, 600), ongoing],
      now,
    );

    expect(stats.averageMinutes).toBe(45);
    expect(stats.reservationCount).toBe(1);
    expect(stats.previous).toEqual({ averageMinutes: 90, reservationCount: 2 });
    expect(stats.topDirections).toEqual([expect.objectContaining({ directionId: TECH.id, totalMinutes: 45 })]);
  });

  it('returns null averages when there is no data', () => {
    expect(computeRoomUsageStats([], now)).toEqual({
      averageMinutes: null,
      reservationCount: 0,
      periodDays: 30,
      previous: { averageMinutes: null, reservationCount: 0 },
      totalMinutes: 0,
      topDirections: [],
    });
  });

  it('rounds to the minute', () => {
    const interval = meeting(1, 0);
    interval.startAt = new Date(interval.endAt.getTime() - 50 * 60_000 - 40_000);
    const stats = computeRoomUsageStats([interval], now);

    expect(stats.averageMinutes).toBe(51);
  });
});

describe('topDirections', () => {
  it('ranks directions by booked time, then by number of meetings', () => {
    const stats = computeRoomUsageStats(
      [meeting(1, 60, SALES), meeting(2, 60, SALES), meeting(3, 180, TECH), meeting(4, 30, SALES)],
      now,
    );

    expect(stats.topDirections).toEqual([
      {
        directionId: TECH.id,
        directionName: TECH.name,
        companyId: 'company-a',
        companyName: 'Appatam',
        reservationCount: 1,
        totalMinutes: 180,
      },
      expect.objectContaining({ directionId: SALES.id, reservationCount: 3, totalMinutes: 150 }),
    ]);

    const tie = computeRoomUsageStats([meeting(1, 60, TECH), meeting(1, 30, SALES), meeting(2, 30, SALES)], now);
    expect(tie.topDirections.map((entry) => entry.directionId)).toEqual([SALES.id, TECH.id]);
  });

  it('groups requesters without direction per company', () => {
    const companyB = { id: 'company-b', name: 'Société B' };
    const stats = computeRoomUsageStats(
      [meeting(1, 120, null, companyB), meeting(2, 60, null, companyB), meeting(3, 90, null)],
      now,
    );

    expect(stats.topDirections).toEqual([
      expect.objectContaining({ directionId: null, companyId: 'company-b', companyName: 'Société B', totalMinutes: 180 }),
      expect.objectContaining({ directionId: null, companyId: 'company-a', totalMinutes: 90 }),
    ]);
  });

  it('keeps only the top entries', () => {
    const directions = Array.from({ length: 7 }, (_, index) => ({ id: `dir-${index}`, name: `D${index}` }));
    const stats = computeRoomUsageStats(
      directions.map((direction, index) => meeting(1, 10 * (index + 1), direction)),
      now,
    );

    expect(stats.topDirections.map((entry) => entry.directionId)).toEqual([
      'dir-6',
      'dir-5',
      'dir-4',
      'dir-3',
      'dir-2',
    ]);
  });
});

describe('roomUsageWindowStart', () => {
  it('covers the current and the previous period', () => {
    expect(roomUsageWindowStart(now).toISOString()).toBe('2026-08-14T10:00:00.000Z');
  });
});

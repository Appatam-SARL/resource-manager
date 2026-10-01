import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@resource-manager/types';
import {
  applyCalendarFilters,
  buildDayAgenda,
  buildWeekStarts,
  countEventsByDay,
  findWeekIndex,
  formatAgendaDayTitle,
  formatMonthLabel,
  getMonthGrid,
  getMonthQueryRange,
  getWeekDays,
  getWeekStart,
  summarizeAgenda,
  type AgendaEventRow,
} from './calendar';

// Monday 28 September 2026, 10:00 local time.
const now = new Date(2026, 8, 28, 10, 0);

function at(month: number, day: number, hour: number, minute = 0): string {
  return new Date(2026, month, day, hour, minute).toISOString();
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'AB-1234-AA',
    start: at(8, 28, 9),
    end: at(8, 28, 11),
    status: 'APPROVED',
    resourceType: 'VEHICLE',
    resourceId: 'v1',
    companyId: 'c1',
    resourceName: 'Toyota Corolla',
    resourceDetail: 'AB-1234-AA',
    context: 'Cocody',
    userId: 'u1',
    requesterName: 'Koné Nonwa',
    ...overrides,
  };
}

function eventRows(rows: ReturnType<typeof buildDayAgenda>): AgendaEventRow[] {
  return rows.filter((row): row is AgendaEventRow => row.kind === 'event');
}

describe('ranges and weeks', () => {
  it('queries full weeks around the month with an exclusive end', () => {
    const range = getMonthQueryRange(now);
    expect(new Date(range.startDate)).toEqual(new Date(2026, 7, 31));
    expect(new Date(range.endDate)).toEqual(new Date(2026, 9, 5));
    expect(range.monthKey).toBe('2026-09');
  });

  it('handles the year change', () => {
    const range = getMonthQueryRange(new Date(2026, 11, 15));
    expect(new Date(range.startDate)).toEqual(new Date(2026, 10, 30));
    expect(new Date(range.endDate)).toEqual(new Date(2027, 0, 4));
    expect(formatMonthLabel(new Date(2027, 0, 1))).toBe('Janvier 2027');
  });

  it('builds Monday-based weeks and finds the selected week', () => {
    const weekStart = getWeekStart(now);
    expect(weekStart).toEqual(new Date(2026, 8, 28));
    expect(getWeekDays(weekStart)[6]).toEqual(new Date(2026, 9, 4));
    const weeks = buildWeekStarts(now, 2, 2);
    expect(weeks).toHaveLength(5);
    expect(findWeekIndex(weeks, new Date(2026, 9, 7))).toBe(3);
    expect(findWeekIndex(weeks, new Date(2027, 5, 1))).toBe(-1);
  });

  it('builds the month grid across the month boundaries', () => {
    const grid = getMonthGrid(now);
    expect(grid[0][0]).toEqual(new Date(2026, 7, 31));
    expect(grid[grid.length - 1][6]).toEqual(new Date(2026, 9, 4));
  });

  it('labels agenda days relatively', () => {
    expect(formatAgendaDayTitle(now, now).title).toBe("Aujourd'hui");
    expect(formatAgendaDayTitle(new Date(2026, 8, 29), now).title).toBe('Demain');
    expect(formatAgendaDayTitle(new Date(2026, 8, 27), now).title).toBe('Hier');
    expect(formatAgendaDayTitle(new Date(2026, 9, 2), now).title).toBe('Vendredi');
  });
});

describe('filters and day counts', () => {
  const events = [
    makeEvent(),
    makeEvent({ id: 'e2', resourceType: 'ROOM', status: 'PENDING', start: at(8, 29, 14), end: at(8, 29, 16) }),
    makeEvent({ id: 'e3', start: at(8, 30, 22), end: at(9, 1, 2) }),
  ];

  it('filters by type and status', () => {
    expect(applyCalendarFilters(events, { resourceType: 'ROOM', status: null }).map((e) => e.id)).toEqual(['e2']);
    expect(applyCalendarFilters(events, { resourceType: null, status: 'PENDING' }).map((e) => e.id)).toEqual(['e2']);
    expect(applyCalendarFilters(events, { resourceType: null, status: null })).toHaveLength(3);
  });

  it('counts multi-day reservations on every day they cover', () => {
    const counts = countEventsByDay(events, getWeekDays(getWeekStart(now)));
    expect(counts.get('2026-09-28')).toBe(1);
    expect(counts.get('2026-09-30')).toBe(1);
    expect(counts.get('2026-10-01')).toBe(1);
    expect(counts.has('2026-10-02')).toBe(false);
  });
});

describe('buildDayAgenda', () => {
  it('returns nothing for an empty day', () => {
    expect(buildDayAgenda([], now, now)).toEqual([]);
  });

  it('sorts events, flags the in-progress one and places the now marker', () => {
    const rows = buildDayAgenda(
      [
        makeEvent({ id: 'later', start: at(8, 28, 14), end: at(8, 28, 16) }),
        makeEvent({ id: 'overlap', start: at(8, 28, 9, 30), end: at(8, 28, 10, 30), resourceType: 'ROOM' }),
        makeEvent({ id: 'current' }),
        makeEvent({ id: 'after', start: at(8, 28, 17), end: at(8, 28, 18) }),
      ],
      now,
      now,
    );
    expect(rows.map((row) => row.key)).toEqual(['current', 'overlap', 'now', 'later', 'after']);
    const events = eventRows(rows);
    expect(events[0]).toMatchObject({ inProgress: true, minutesLeft: 60, timeRange: '09:00 → 11:00' });
    expect(events[1].inProgress).toBe(true);
    expect(events[2].isNext).toBe(true);
    expect(events[3].isNext).toBe(false);
    expect(summarizeAgenda(rows)).toBe('4 réservations · 2 en cours');
  });

  it('never flags completed reservations as in progress', () => {
    const rows = eventRows(buildDayAgenda([makeEvent({ status: 'COMPLETED' })], now, now));
    expect(rows[0].inProgress).toBe(false);
  });

  it('shows no now marker on another day', () => {
    const day = new Date(2026, 8, 29);
    const rows = buildDayAgenda([makeEvent({ start: at(8, 29, 9), end: at(8, 29, 10) })], day, now);
    expect(rows.some((row) => row.kind === 'now')).toBe(false);
  });

  it('describes multi-day reservations on each covered day', () => {
    const overnight = makeEvent({ start: at(8, 28, 22), end: at(8, 29, 2) });
    const first = eventRows(buildDayAgenda([overnight], now, now))[0];
    expect(first).toMatchObject({ railLabel: '22:00', timeRange: '22:00 → 02:00', spanNote: 'Se poursuit le lendemain' });
    const second = eventRows(buildDayAgenda([overnight], new Date(2026, 8, 29), now))[0];
    expect(second).toMatchObject({ railLabel: '00:00', spanNote: 'Commencée la veille' });
  });

  it('does not treat an end at midnight as continuing the next day', () => {
    const untilMidnight = makeEvent({ start: at(8, 28, 20), end: at(8, 29, 0) });
    expect(eventRows(buildDayAgenda([untilMidnight], now, now))[0].spanNote).toBeNull();
    expect(buildDayAgenda([untilMidnight], new Date(2026, 8, 29), now)).toEqual([]);
  });
});

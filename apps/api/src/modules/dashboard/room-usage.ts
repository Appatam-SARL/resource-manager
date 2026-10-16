export const ROOM_USAGE_PERIOD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RoomUsagePeriod = {
  /** Rounded to the minute; null when no meeting ended in the period. */
  averageMinutes: number | null;
  reservationCount: number;
};

export type RoomUsageByDirection = {
  /** null groups the requesters attached directly to their company. */
  directionId: string | null;
  directionName: string | null;
  companyId: string;
  companyName: string;
  reservationCount: number;
  totalMinutes: number;
};

export type RoomUsageStats = RoomUsagePeriod & {
  periodDays: number;
  previous: RoomUsagePeriod;
  /** Booked minutes of the current period, all directions included. */
  totalMinutes: number;
  /** Most room-consuming directions of the current period, by booked time. */
  topDirections: RoomUsageByDirection[];
};

export const ROOM_USAGE_TOP_DIRECTIONS = 5;

type UsageInterval = { startAt: Date; endAt: Date };

export type DirectionUsageInterval = UsageInterval & {
  companyId: string;
  company: { name: string };
  direction: { id: string; name: string } | null;
};

function durationMs(interval: UsageInterval): number {
  return Math.max(0, interval.endAt.getTime() - interval.startAt.getTime());
}

function rankDirections(intervals: DirectionUsageInterval[], limit: number): RoomUsageByDirection[] {
  const byKey = new Map<string, RoomUsageByDirection & { totalMs: number }>();
  for (const interval of intervals) {
    const key = interval.direction ? `d:${interval.direction.id}` : `c:${interval.companyId}`;
    const entry = byKey.get(key) ?? {
      directionId: interval.direction?.id ?? null,
      directionName: interval.direction?.name ?? null,
      companyId: interval.companyId,
      companyName: interval.company.name,
      reservationCount: 0,
      totalMinutes: 0,
      totalMs: 0,
    };
    entry.reservationCount += 1;
    entry.totalMs += durationMs(interval);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .sort(
      (a, b) =>
        b.totalMs - a.totalMs ||
        b.reservationCount - a.reservationCount ||
        (a.directionName ?? '').localeCompare(b.directionName ?? '', 'fr'),
    )
    .slice(0, limit)
    .map(({ totalMs, ...entry }) => ({ ...entry, totalMinutes: Math.round(totalMs / 60_000) }));
}

function summarize(intervals: UsageInterval[]): RoomUsagePeriod {
  if (intervals.length === 0) return { averageMinutes: null, reservationCount: 0 };
  const totalMs = intervals.reduce((sum, interval) => sum + durationMs(interval), 0);
  return {
    averageMinutes: Math.round(totalMs / intervals.length / 60_000),
    reservationCount: intervals.length,
  };
}

/** Lower bound of `endAt` covering the current and the previous period. */
export function roomUsageWindowStart(now: Date, periodDays = ROOM_USAGE_PERIOD_DAYS): Date {
  return new Date(now.getTime() - 2 * periodDays * DAY_MS);
}

/**
 * Average booked duration of the meetings that ended in the last `periodDays` days,
 * compared with the period just before, and the directions that booked rooms the most.
 */
export function computeRoomUsageStats(
  intervals: DirectionUsageInterval[],
  now: Date,
  periodDays = ROOM_USAGE_PERIOD_DAYS,
  topDirectionsLimit = ROOM_USAGE_TOP_DIRECTIONS,
): RoomUsageStats {
  const currentStart = now.getTime() - periodDays * DAY_MS;
  const previousStart = currentStart - periodDays * DAY_MS;
  const current: DirectionUsageInterval[] = [];
  const previous: DirectionUsageInterval[] = [];
  for (const interval of intervals) {
    const end = interval.endAt.getTime();
    if (end > now.getTime()) continue;
    if (end > currentStart) current.push(interval);
    else if (end > previousStart) previous.push(interval);
  }
  return {
    ...summarize(current),
    periodDays,
    previous: summarize(previous),
    totalMinutes: Math.round(current.reduce((sum, interval) => sum + durationMs(interval), 0) / 60_000),
    topDirections: rankDirections(current, topDirectionsLimit),
  };
}

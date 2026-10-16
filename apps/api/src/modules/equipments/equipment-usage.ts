import { EquipmentScope, ResourceType } from '@prisma/client';

export type EquipmentUsageInterval = {
  startAt: Date;
  endAt: Date;
  quantity: number;
};

/**
 * Highest number of units used at the same time inside [windowStart, windowEnd[
 * (windowEnd null = open-ended). Intervals are half-open: a reservation ending at
 * 11:00 and another starting at 11:00 never use the stock simultaneously.
 */
export function computePeakUsage(
  intervals: EquipmentUsageInterval[],
  windowStart: Date,
  windowEnd: Date | null,
): number {
  const events: { at: number; delta: number }[] = [];
  for (const interval of intervals) {
    const start = Math.max(interval.startAt.getTime(), windowStart.getTime());
    const end = Math.min(
      interval.endAt.getTime(),
      windowEnd ? windowEnd.getTime() : Number.POSITIVE_INFINITY,
    );
    if (start >= end || interval.quantity <= 0) continue;
    events.push({ at: start, delta: interval.quantity });
    events.push({ at: end, delta: -interval.quantity });
  }

  // Releases are applied before acquisitions happening at the same instant.
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

export function isScopeCompatible(
  scope: EquipmentScope,
  resourceType: ResourceType,
): boolean {
  return scope === EquipmentScope.BOTH || scope === resourceType;
}

export function scopesForResourceType(resourceType: ResourceType): EquipmentScope[] {
  return resourceType === ResourceType.VEHICLE
    ? [EquipmentScope.VEHICLE, EquipmentScope.BOTH]
    : [EquipmentScope.ROOM, EquipmentScope.BOTH];
}

import { EquipmentScope, ResourceType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { computePeakUsage, isScopeCompatible } from './equipment-usage.js';

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 20, hour, minute));

describe('computePeakUsage', () => {
  it('returns 0 without overlapping usage', () => {
    expect(computePeakUsage([], at(10), at(11))).toBe(0);
    expect(
      computePeakUsage([{ startAt: at(8), endAt: at(10), quantity: 3 }], at(10), at(11)),
    ).toBe(0);
  });

  it('counts a partial overlap', () => {
    expect(
      computePeakUsage([{ startAt: at(10, 30), endAt: at(11, 30), quantity: 1 }], at(10), at(11)),
    ).toBe(1);
  });

  it('keeps the peak of simultaneous usage instead of summing disjoint intervals', () => {
    const intervals = [
      { startAt: at(9), endAt: at(10, 15), quantity: 1 },
      { startAt: at(10, 30), endAt: at(12), quantity: 1 },
    ];
    expect(computePeakUsage(intervals, at(9), at(12))).toBe(1);
  });

  it('adds overlapping intervals', () => {
    const intervals = [
      { startAt: at(9), endAt: at(11), quantity: 2 },
      { startAt: at(10), endAt: at(12), quantity: 1 },
    ];
    expect(computePeakUsage(intervals, at(9), at(12))).toBe(3);
  });

  it('treats intervals as half-open: back-to-back reservations do not overlap', () => {
    const intervals = [
      { startAt: at(9), endAt: at(10), quantity: 1 },
      { startAt: at(10), endAt: at(11), quantity: 1 },
    ];
    expect(computePeakUsage(intervals, at(9), at(11))).toBe(1);
  });

  it('supports an open-ended window', () => {
    const intervals = [{ startAt: at(20), endAt: at(22), quantity: 4 }];
    expect(computePeakUsage(intervals, at(10), null)).toBe(4);
  });
});

describe('isScopeCompatible', () => {
  it('matches the resource type or BOTH', () => {
    expect(isScopeCompatible(EquipmentScope.ROOM, ResourceType.ROOM)).toBe(true);
    expect(isScopeCompatible(EquipmentScope.BOTH, ResourceType.VEHICLE)).toBe(true);
    expect(isScopeCompatible(EquipmentScope.ROOM, ResourceType.VEHICLE)).toBe(false);
    expect(isScopeCompatible(EquipmentScope.VEHICLE, ResourceType.ROOM)).toBe(false);
  });
});

import { useMemo } from 'react';
import type { ResourceType } from '@resource-manager/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { combineDateAndTime } from '@/lib/format';
import type { Schedule } from '@/features/reservations/lib/schedule';
import { useAvailability, type AvailabilityParams } from './use-reservations';

const AVAILABILITY_DEBOUNCE_MS = 400;

/** Real-time slot check against GET /reservations/availability, only once inputs are valid. */
export function useSlotAvailability(input: {
  resourceType: ResourceType;
  resourceId: string;
  schedule: Schedule;
  enabled: boolean;
}) {
  const { resourceType, resourceId, enabled } = input;
  const { startDate, startTime, endDate, endTime } = input.schedule;

  const params = useMemo<AvailabilityParams | null>(() => {
    if (!enabled || !resourceId) return null;
    return {
      resourceType,
      resourceId,
      startAt: combineDateAndTime(startDate, startTime),
      endAt: combineDateAndTime(endDate, endTime),
    };
  }, [enabled, resourceType, resourceId, startDate, startTime, endDate, endTime]);

  const debouncedParams = useDebouncedValue(params, AVAILABILITY_DEBOUNCE_MS);
  const query = useAvailability(debouncedParams);
  const isSettling = params !== debouncedParams;

  return {
    data: debouncedParams ? query.data : undefined,
    isChecking: Boolean(params) && (isSettling || query.isFetching),
    isError: !isSettling && query.isError,
    refetch: query.refetch,
  };
}

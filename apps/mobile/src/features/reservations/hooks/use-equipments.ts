import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EquipmentAvailability,
  ReservationEquipmentInput,
  ResourceType,
} from '@resource-manager/types';
import { equipmentsApi, reservationsApi, type EquipmentAvailabilityParams } from '@/api/client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { combineDateAndTime } from '@/lib/format';
import {
  clampSelectionToAvailability,
  describeSelection,
  formatEquipmentAdjustments,
  toEquipmentPayload,
  type EquipmentSelection,
} from '@/features/reservations/lib/equipment-selection';
import type { Schedule } from '@/features/reservations/lib/schedule';

const EQUIPMENT_AVAILABILITY_DEBOUNCE_MS = 400;

/**
 * Stock left per equipment on the slot (GET /equipments/availability), refreshed when the slot changes.
 * The previous list stays displayed while the new slot is being checked.
 */
export function useEquipmentAvailability(input: {
  resourceType: ResourceType;
  startAt: string | null;
  endAt: string | null;
  excludeReservationId?: string;
  enabled: boolean;
}) {
  const { resourceType, startAt, endAt, excludeReservationId, enabled } = input;
  const params = useMemo<EquipmentAvailabilityParams | null>(() => {
    if (!enabled || !startAt || !endAt) return null;
    return { resourceType, startAt, endAt, excludeReservationId };
  }, [enabled, resourceType, startAt, endAt, excludeReservationId]);

  const debouncedParams = useDebouncedValue(params, EQUIPMENT_AVAILABILITY_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ['equipment-availability', debouncedParams],
    enabled: Boolean(debouncedParams),
    queryFn: ({ signal }) => equipmentsApi.availability(debouncedParams!, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  const isSettling = params !== debouncedParams;

  return {
    data: query.data,
    isLoading: Boolean(params) && (isSettling || query.isFetching),
    isError: !isSettling && query.isError,
    refetch: query.refetch,
  };
}

/**
 * Lowers the selected quantities when fresh availability no longer covers them
 * (slot changed, someone else booked) and tells the user what was adjusted.
 */
export function useClampEquipmentSelection(
  availability: EquipmentAvailability[] | undefined,
  selection: EquipmentSelection,
  onChange: (selection: EquipmentSelection) => void,
  knownNames?: Record<string, string>,
) {
  const selectionRef = useRef(selection);
  const onChangeRef = useRef(onChange);
  const namesRef = useRef(knownNames);

  useEffect(() => {
    selectionRef.current = selection;
    onChangeRef.current = onChange;
    namesRef.current = knownNames;
  });

  useEffect(() => {
    if (!availability) return;
    const { selection: clamped, adjustments } = clampSelectionToAvailability(
      selectionRef.current,
      availability,
      namesRef.current,
    );
    if (adjustments.length === 0) return;
    onChangeRef.current(clamped);
    Alert.alert('Équipements ajustés', formatEquipmentAdjustments(adjustments), [{ text: 'J’ai compris' }]);
  }, [availability]);
}

/** Equipment selection of a reservation form, kept consistent with the stock left on the chosen slot. */
export function useSlotEquipmentSelection(input: {
  resourceType: ResourceType;
  schedule: Schedule;
  scheduleValid: boolean;
}) {
  const { resourceType, schedule, scheduleValid } = input;
  const [selection, setSelection] = useState<EquipmentSelection>({});
  const availability = useEquipmentAvailability({
    resourceType,
    startAt: scheduleValid ? combineDateAndTime(schedule.startDate, schedule.startTime) : null,
    endAt: scheduleValid ? combineDateAndTime(schedule.endDate, schedule.endTime) : null,
    enabled: scheduleValid,
  });
  useClampEquipmentSelection(availability.data, selection, setSelection);

  return {
    selection,
    setSelection,
    availability,
    payload: toEquipmentPayload(selection),
    summaryLines: describeSelection(selection, availability.data ?? []),
  };
}

export function useReplaceReservationEquipments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, equipments }: { id: string; equipments: ReservationEquipmentInput[] }) =>
      reservationsApi.replaceEquipments(id, equipments),
    retry: 0,
    onSuccess: (reservation) => {
      queryClient.setQueryData(['reservations', reservation.id], reservation);
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['equipment-availability'] });
    },
  });
}

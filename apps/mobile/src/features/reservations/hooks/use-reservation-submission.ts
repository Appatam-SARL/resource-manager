import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Reservation } from '@resource-manager/types';
import {
  getReservationSubmitError,
  type ReservationSubmitError,
} from '@/features/reservations/lib/reservation-errors';
import { useCreateReservation, type CreateReservationBody } from './use-reservations';

export function useReservationSubmission() {
  const queryClient = useQueryClient();
  const createMutation = useCreateReservation();
  const [submitError, setSubmitError] = useState<ReservationSubmitError | null>(null);

  const submit = async (
    body: CreateReservationBody,
  ): Promise<{ reservation: Reservation; error: null } | { reservation: null; error: ReservationSubmitError }> => {
    setSubmitError(null);
    try {
      return { reservation: await createMutation.mutateAsync(body), error: null };
    } catch (error) {
      const mapped = getReservationSubmitError(error);
      setSubmitError(mapped);
      if (mapped.kind === 'conflict') {
        void queryClient.invalidateQueries({ queryKey: ['availability'] });
      }
      if (mapped.kind === 'equipment') {
        void queryClient.invalidateQueries({ queryKey: ['equipment-availability'] });
      }
      return { reservation: null, error: mapped };
    }
  };

  return {
    submit,
    submitError,
    setSubmitError,
    clearSubmitError: () => setSubmitError(null),
    isSubmitting: createMutation.isPending,
  };
}

export type ReservationSuccessData = {
  reservation: Reservation;
  resourceName: string;
  scheduleLabel: string;
};

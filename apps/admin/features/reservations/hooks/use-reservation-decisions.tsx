'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { RejectReservationDialog } from '@/features/reservations/components/reject-reservation-dialog';
import {
  useApproveReservation,
  useCancelReservation,
  useRejectReservation,
} from '@/features/reservations/hooks/use-reservations';

type Decision = { type: 'approve' | 'reject' | 'cancel'; id: string } | null;

/**
 * Approve / reject / cancel confirmation dialogs shared by the list and the detail page.
 * Permissions are still enforced by the API; callers only decide which actions to show.
 */
export function useReservationDecisions(onDone?: () => void): {
  approve: (id: string) => void;
  reject: (id: string) => void;
  cancel: (id: string) => void;
  dialogs: ReactNode;
} {
  const [decision, setDecision] = useState<Decision>(null);
  const approveMutation = useApproveReservation();
  const rejectMutation = useRejectReservation();
  const cancelMutation = useCancelReservation();

  const close = () => setDecision(null);
  const settle = {
    onSettled: () => {
      close();
      onDone?.();
    },
  };
  const closeWhenHidden = (open: boolean) => {
    if (!open) close();
  };

  const dialogs = (
    <>
      <ConfirmDialog
        open={decision?.type === 'approve'}
        onOpenChange={closeWhenHidden}
        title="Approuver la réservation"
        description="Le demandeur sera notifié et le créneau restera bloqué pour cette réservation."
        confirmLabel="Approuver"
        loading={approveMutation.isPending}
        onConfirm={() => {
          if (decision) approveMutation.mutate(decision.id, settle);
        }}
      />
      <RejectReservationDialog
        open={decision?.type === 'reject'}
        onOpenChange={closeWhenHidden}
        loading={rejectMutation.isPending}
        onConfirm={(rejectionReason) => {
          if (decision) rejectMutation.mutate({ id: decision.id, rejectionReason }, settle);
        }}
      />
      <ConfirmDialog
        open={decision?.type === 'cancel'}
        onOpenChange={closeWhenHidden}
        title="Annuler la réservation"
        description="Le créneau sera libéré et le demandeur notifié. Cette action est définitive."
        confirmLabel="Annuler la réservation"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (decision) cancelMutation.mutate(decision.id, settle);
        }}
      />
    </>
  );

  return {
    approve: (id) => setDecision({ type: 'approve', id }),
    reject: (id) => setDecision({ type: 'reject', id }),
    cancel: (id) => setDecision({ type: 'cancel', id }),
    dialogs,
  };
}

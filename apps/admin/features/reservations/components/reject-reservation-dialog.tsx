'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  rejectReservationFormSchema,
  type RejectReservationFormValues,
} from '@/features/reservations/schemas/reject-schema';

type RejectReservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejectionReason: string) => void;
  loading?: boolean;
};

export function RejectReservationDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: RejectReservationDialogProps) {
  const form = useForm<RejectReservationFormValues>({
    resolver: zodResolver(rejectReservationFormSchema),
    defaultValues: { rejectionReason: '' },
  });
  const error = form.formState.errors.rejectionReason;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ rejectionReason: '' });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la réservation</DialogTitle>
          <DialogDescription>
            Le motif sera communiqué au demandeur. Il est obligatoire.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            onConfirm(values.rejectionReason);
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="rejectionReason">Motif du refus</Label>
            <Textarea
              id="rejectionReason"
              rows={4}
              placeholder="Ex. : véhicule déjà affecté à une mission prioritaire"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'rejectionReason-error' : undefined}
              {...form.register('rejectionReason')}
            />
            {error ? (
              <p id="rejectionReason-error" className="text-xs text-destructive">
                {error.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Retour
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Refus…' : 'Refuser la demande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

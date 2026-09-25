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
          <DialogTitle>Rejeter la réservation</DialogTitle>
          <DialogDescription>
            Un motif de rejet est obligatoire (3 caractères minimum).
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            onConfirm(values.rejectionReason);
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="rejectionReason">Motif du rejet</Label>
            <Textarea
              id="rejectionReason"
              rows={4}
              {...form.register('rejectionReason')}
            />
            {form.formState.errors.rejectionReason ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.rejectionReason.message}
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
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Rejet…' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

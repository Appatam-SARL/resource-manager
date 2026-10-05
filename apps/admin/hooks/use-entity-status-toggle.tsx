'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

type EntityStatus = 'ACTIVE' | 'INACTIVE';
type Target = { id: string; name: string; status: EntityStatus };

type EntityStatusToggleOptions = {
  /** "l’entreprise", "la direction"… */
  entityLabel: string;
  deactivateConsequence: string;
  activateConsequence: string;
  successMessages: { deactivated: string; activated: string };
  mutateAsync: (variables: { id: string; status: EntityStatus }) => Promise<unknown>;
  isPending: boolean;
};

/** Activate / deactivate an organisational entity behind a confirmation dialog. */
export function useEntityStatusToggle(options: EntityStatusToggleOptions): {
  request: (target: Target) => void;
  dialog: ReactNode;
} {
  const [target, setTarget] = useState<Target | null>(null);
  const deactivate = target?.status === 'ACTIVE';

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
      title={deactivate ? `Désactiver ${options.entityLabel}` : `Réactiver ${options.entityLabel}`}
      description={`${target?.name ?? ''} — ${deactivate ? options.deactivateConsequence : options.activateConsequence}`}
      confirmLabel={deactivate ? 'Désactiver' : 'Réactiver'}
      destructive={deactivate}
      loading={options.isPending}
      onConfirm={() => {
        if (!target) return;
        const status: EntityStatus = deactivate ? 'INACTIVE' : 'ACTIVE';
        options
          .mutateAsync({ id: target.id, status })
          .then(() => {
            toast.success(status === 'INACTIVE' ? options.successMessages.deactivated : options.successMessages.activated);
            setTarget(null);
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Impossible de modifier le statut');
          });
      }}
    />
  );

  return { request: setTarget, dialog };
}

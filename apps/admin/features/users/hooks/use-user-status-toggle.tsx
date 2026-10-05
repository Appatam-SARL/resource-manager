'use client';

import { useState, type ReactNode } from 'react';
import type { User } from '@resource-manager/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUpdateUserStatus } from '@/features/users/hooks/use-users';

type Target = Pick<User, 'id' | 'firstName' | 'lastName' | 'status'>;

/** Activate / deactivate a user account behind a confirmation dialog (list and detail page). */
export function useUserStatusToggle(): { request: (user: Target) => void; dialog: ReactNode } {
  const [target, setTarget] = useState<Target | null>(null);
  const updateStatus = useUpdateUserStatus();
  const deactivate = target?.status === 'ACTIVE';
  const name = target ? `${target.firstName} ${target.lastName}` : '';

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
      title={deactivate ? 'Désactiver le compte' : 'Réactiver le compte'}
      description={
        deactivate
          ? `${name} ne pourra plus se connecter ni réserver. Son historique est conservé.`
          : `${name} pourra de nouveau se connecter et réserver.`
      }
      confirmLabel={deactivate ? 'Désactiver' : 'Réactiver'}
      destructive={deactivate}
      loading={updateStatus.isPending}
      onConfirm={() => {
        if (!target) return;
        const nextStatus = deactivate ? 'INACTIVE' : 'ACTIVE';
        updateStatus.mutate(
          { id: target.id, status: nextStatus },
          {
            onSuccess: () => {
              toast.success(nextStatus === 'INACTIVE' ? 'Compte désactivé' : 'Compte réactivé');
              setTarget(null);
            },
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : 'Impossible de modifier le statut du compte');
            },
          },
        );
      }}
    />
  );

  return { request: setTarget, dialog };
}

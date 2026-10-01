'use client';

import { useUpdateDirectionStatus } from '@/features/directions/hooks/use-directions';
import { useEntityStatusToggle } from '@/hooks/use-entity-status-toggle';

export function useDirectionStatusToggle() {
  const mutation = useUpdateDirectionStatus();
  return useEntityStatusToggle({
    entityLabel: 'la direction',
    deactivateConsequence:
      'elle ne sera plus proposée dans les formulaires de rattachement. Les utilisateurs déjà rattachés sont conservés.',
    activateConsequence: 'elle pourra de nouveau être utilisée pour les rattachements.',
    successMessages: { deactivated: 'Direction désactivée', activated: 'Direction réactivée' },
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  });
}

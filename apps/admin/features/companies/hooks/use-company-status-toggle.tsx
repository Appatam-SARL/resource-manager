'use client';

import { useUpdateCompanyStatus } from '@/features/companies/hooks/use-companies';
import { useEntityStatusToggle } from '@/hooks/use-entity-status-toggle';

export function useCompanyStatusToggle() {
  const mutation = useUpdateCompanyStatus();
  return useEntityStatusToggle({
    entityLabel: 'l’entreprise',
    deactivateConsequence:
      'aucune nouvelle réservation ni aucun nouvel utilisateur ne pourra être créé pour cette entreprise. Son historique reste consultable.',
    activateConsequence: 'l’entreprise pourra de nouveau recevoir des réservations.',
    successMessages: { deactivated: 'Entreprise désactivée', activated: 'Entreprise réactivée' },
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  });
}

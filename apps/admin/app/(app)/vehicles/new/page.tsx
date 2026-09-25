'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { VehicleForm, useCreateVehicle } from '@/features/vehicles';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';
import { ErrorState } from '@/components/shared/error-state';

export default function NewVehiclePage() {
  const { user } = useAuth();
  const router = useRouter();
  const createMutation = useCreateVehicle();

  if (!user || !canManageResources(user.role)) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les administrateurs peuvent créer un véhicule."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouveau véhicule"
        description="Ajoutez un véhicule à une entreprise du Groupe."
      />
      <VehicleForm
        loading={createMutation.isPending}
        submitLabel="Créer le véhicule"
        onSubmit={async (values) => {
          const created = await createMutation.mutateAsync(values);
          router.push(`/vehicles/${created.id}`);
        }}
      />
    </div>
  );
}

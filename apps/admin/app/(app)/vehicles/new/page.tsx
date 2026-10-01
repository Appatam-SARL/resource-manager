'use client';

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { VehicleForm, useCreateVehicle } from '@/features/vehicles';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        back={{ href: '/vehicles', label: 'Véhicules' }}
        title="Nouveau véhicule"
        description="Le véhicule sera immédiatement réservable par les collaborateurs de son entreprise."
      />
      <VehicleForm
        loading={createMutation.isPending}
        submitLabel="Créer le véhicule"
        cancelHref="/vehicles"
        onSubmit={async (values) => {
          const created = await createMutation.mutateAsync(values);
          router.push(`/vehicles/${created.id}`);
        }}
      />
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/shared/error-state';
import { PageHeader } from '@/components/shared/page-header';
import { toast } from 'sonner';
import {
  VehicleForm,
  uploadVehicleImageFile,
  useCreateVehicle,
  vehicleImageErrorMessage,
} from '@/features/vehicles';
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
        description="Le véhicule sera immédiatement réservable par les collaborateurs du Groupe."
      />
      <VehicleForm
        loading={createMutation.isPending}
        submitLabel="Créer le véhicule"
        cancelHref="/vehicles"
        onSubmit={async (values, { imageFile }) => {
          const created = await createMutation.mutateAsync(values);
          if (imageFile) {
            try {
              await uploadVehicleImageFile(created.id, imageFile);
            } catch (error) {
              toast.error(
                `Véhicule créé, mais la photo n’a pas été enregistrée : ${vehicleImageErrorMessage(error, 'erreur inattendue')}. Vous pourrez l’ajouter depuis la fiche du véhicule.`,
              );
            }
          }
          router.push(`/vehicles/${created.id}`);
        }}
      />
    </div>
  );
}

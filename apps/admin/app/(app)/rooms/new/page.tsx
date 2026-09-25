'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { RoomForm, useCreateRoom } from '@/features/rooms';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

export default function NewRoomPage() {
  const { user } = useAuth();
  const router = useRouter();
  const createMutation = useCreateRoom();

  if (!user || !canManageResources(user.role)) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les administrateurs peuvent créer une salle."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouvelle salle"
        description="Ajoutez une salle de réunion à une entreprise."
      />
      <RoomForm
        loading={createMutation.isPending}
        submitLabel="Créer la salle"
        onSubmit={async (values) => {
          const created = await createMutation.mutateAsync(values);
          router.push(`/rooms/${created.id}`);
        }}
      />
    </div>
  );
}

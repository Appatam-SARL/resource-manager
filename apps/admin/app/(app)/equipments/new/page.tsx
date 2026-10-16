'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { EquipmentForm, useCreateEquipment } from '@/features/equipments';

export default function NewEquipmentPage() {
  const router = useRouter();
  const createMutation = useCreateEquipment();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        back={{ href: '/equipments', label: 'Équipements' }}
        title="Nouvel équipement"
        description="L’équipement pourra être demandé avec une réservation dès sa création."
      />
      <EquipmentForm
        loading={createMutation.isPending}
        submitLabel="Créer l’équipement"
        cancelHref="/equipments"
        onSubmit={async (values) => {
          const created = await createMutation.mutateAsync(values);
          router.push(`/equipments/${created.id}`);
        }}
      />
    </div>
  );
}

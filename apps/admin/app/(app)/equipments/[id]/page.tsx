'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ResourceStatusPanel } from '@/components/shared/resource-status-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  EQUIPMENT_SCOPE_LABELS,
  EquipmentForm,
  useDeleteEquipment,
  useEquipment,
  useUpdateEquipment,
  useUpdateEquipmentStatus,
} from '@/features/equipments';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EquipmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const equipmentQuery = useEquipment(id);
  const updateMutation = useUpdateEquipment(id);
  const statusMutation = useUpdateEquipmentStatus(id);
  const deleteMutation = useDeleteEquipment();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (equipmentQuery.isLoading) {
    return <LoadingState label="Chargement de l’équipement…" />;
  }

  if (equipmentQuery.isError || !equipmentQuery.data) {
    return (
      <DetailErrorState
        error={equipmentQuery.error}
        notFoundTitle="Équipement introuvable"
        errorTitle="Impossible de charger l’équipement"
        backHref="/equipments"
        backLabel="Retour aux équipements"
        onRetry={() => void equipmentQuery.refetch()}
        retrying={equipmentQuery.isFetching}
      />
    );
  }

  const equipment = equipmentQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/equipments', label: 'Équipements' }}
        title={equipment.name}
        meta={
          <>
            <StatusBadge status={equipment.status} />
            <span>{EQUIPMENT_SCOPE_LABELS[equipment.scope]}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{equipment.quantity} unité(s)</span>
          </>
        }
        actions={
          <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            Supprimer
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <EquipmentForm
            initial={equipment}
            loading={updateMutation.isPending}
            submitLabel="Enregistrer les modifications"
            onSubmit={async (values) => {
              await updateMutation.mutateAsync(values);
            }}
          />
        </div>
        <div className="space-y-4">
          <ResourceStatusPanel
            status={equipment.status}
            resourceLabel="cet équipement"
            canManage
            pending={statusMutation.isPending}
            onChange={(status) => statusMutation.mutate(status)}
          />
          <Panel title="Règles" variant="plain">
            <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-muted-foreground">
              <li>La quantité ne peut pas descendre sous le nombre d’unités déjà engagées sur des réservations à venir.</li>
              <li>Un équipement déjà utilisé par une réservation ne peut pas être supprimé : mettez-le hors service.</li>
            </ul>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer l’équipement"
        description={`« ${equipment.name} » sera retiré du catalogue. Cette action est impossible si l’équipement figure sur une réservation.`}
        confirmLabel="Supprimer"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(equipment.id, {
            onSuccess: () => router.push('/equipments'),
            onSettled: () => setConfirmDelete(false),
          });
        }}
      />
    </div>
  );
}

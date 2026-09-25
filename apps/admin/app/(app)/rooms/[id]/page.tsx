'use client';

import { use } from 'react';
import type { ResourceStatus } from '@resource-manager/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RoomForm,
  useRoom,
  useUpdateRoom,
  useUpdateRoomStatus,
} from '@/features/rooms';
import { RESOURCE_STATUS_LABELS } from '@/lib/format';
import { canManageResources } from '@/lib/reservation-permissions';
import { useAuth } from '@/providers/auth-provider';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function RoomDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const roomQuery = useRoom(id);
  const updateMutation = useUpdateRoom(id);
  const statusMutation = useUpdateRoomStatus(id);
  const canManage = user ? canManageResources(user.role) : false;

  if (roomQuery.isLoading) {
    return <LoadingState label="Chargement de la salle…" />;
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <ErrorState
        title="Salle introuvable"
        onRetry={() => {
          void roomQuery.refetch();
        }}
      />
    );
  }

  const room = roomQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={room.name}
        description={`${room.location || 'Sans localisation'} · ${room.company?.name ?? 'Entreprise'}`}
        actions={<StatusBadge status={room.status} />}
      />

      {canManage ? (
        <div className="space-y-1.5 rounded-3xl bg-card p-5 ring-1 ring-border/60">
          <Label>Statut de la salle</Label>
          <Select
            value={room.status}
            onValueChange={(value) => {
              if (value && value !== room.status) {
                statusMutation.mutate(value as ResourceStatus);
              }
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {RESOURCE_STATUS_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Préférez le changement de statut à la suppression.
          </p>
        </div>
      ) : null}

      {canManage ? (
        <RoomForm
          initial={room}
          loading={updateMutation.isPending}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (values) => {
            // companyId is immutable on update
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit companyId
            const { companyId, ...payload } = values;
            await updateMutation.mutateAsync(payload);
            void roomQuery.refetch();
          }}
        />
      ) : (
        <div className="space-y-3 rounded-3xl bg-card p-5 text-sm ring-1 ring-border/60">
          <p>
            <span className="text-muted-foreground">Capacité :</span>{' '}
            {room.capacity}
          </p>
          <p>
            <span className="text-muted-foreground">Description :</span>{' '}
            {room.description || '—'}
          </p>
        </div>
      )}
    </div>
  );
}

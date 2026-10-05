'use client';

import { use } from 'react';
import { Building2, MapPin } from 'lucide-react';
import { DetailErrorState } from '@/components/shared/detail-error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { Panel } from '@/components/shared/panel';
import { ResourceStatusPanel } from '@/components/shared/resource-status-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { ResourceReservationsPanel } from '@/features/reservations';
import {
  RoomForm,
  useRoom,
  useUpdateRoom,
  useUpdateRoomStatus,
} from '@/features/rooms';
import { canManageResource } from '@/lib/reservation-permissions';
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
  if (roomQuery.isLoading) {
    return <LoadingState label="Chargement de la salle…" />;
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <DetailErrorState
        error={roomQuery.error}
        notFoundTitle="Salle introuvable"
        errorTitle="Impossible de charger la salle"
        backHref="/rooms"
        backLabel="Retour aux salles"
        onRetry={() => void roomQuery.refetch()}
        retrying={roomQuery.isFetching}
      />
    );
  }

  const room = roomQuery.data;
  const canManage = user ? canManageResource(user, room) : false;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: '/rooms', label: 'Salles' }}
        title={room.name}
        meta={
          <>
            <StatusBadge status={room.status} />
            {room.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {room.location}
              </span>
            ) : null}
            {room.company ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden />
                {room.company.name}
              </span>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {canManage ? (
            <RoomForm
              initial={room}
              loading={updateMutation.isPending}
              submitLabel="Enregistrer les modifications"
              onSubmit={async (values) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- companyId is immutable on update
                const { companyId, ...payload } = values;
                await updateMutation.mutateAsync(payload);
              }}
            />
          ) : (
            <Panel title="Caractéristiques">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Capacité</dt>
                  <dd className="text-sm text-foreground">{room.capacity} personnes</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                  <dd className="text-sm whitespace-pre-line text-foreground">{room.description || '—'}</dd>
                </div>
              </dl>
            </Panel>
          )}
        </div>
        <div className="space-y-4">
          <ResourceStatusPanel
            status={room.status}
            resourceLabel="cette salle"
            canManage={canManage}
            pending={statusMutation.isPending}
            onChange={(status) => statusMutation.mutate(status)}
          />
          <ResourceReservationsPanel roomId={room.id} />
        </div>
      </div>
    </div>
  );
}

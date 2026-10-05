'use client';

import { CalendarSearch } from 'lucide-react';
import { Panel } from '@/components/shared/panel';
import { ReservationMiniList } from '@/components/shared/reservation-mini-list';
import { useReservations } from '@/features/reservations/hooks/use-reservations';

const PREVIEW_SIZE = 5;

type ResourceReservationsPanelProps = {
  vehicleId?: string;
  roomId?: string;
  userId?: string;
  emptyDescription?: string;
};

/** Latest reservations of a vehicle, a room or a requester (GET /reservations, scoped by the API). */
export function ResourceReservationsPanel({
  vehicleId,
  roomId,
  userId,
  emptyDescription = 'Cette ressource n’a encore jamais été réservée.',
}: ResourceReservationsPanelProps) {
  const query = useReservations({ page: 1, limit: PREVIEW_SIZE, vehicleId, roomId, userId });
  const total = query.data?.meta.total;

  return (
    <Panel
      title="Réservations"
      description={
        total !== undefined && total > PREVIEW_SIZE
          ? `Les ${PREVIEW_SIZE} plus récentes sur ${total}`
          : 'Les plus récentes, par date de début'
      }
      flush
    >
      <ReservationMiniList
        reservations={query.data?.data}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        skeletonRows={3}
        empty={{ icon: CalendarSearch, title: 'Aucune réservation', description: emptyDescription }}
      />
    </Panel>
  );
}

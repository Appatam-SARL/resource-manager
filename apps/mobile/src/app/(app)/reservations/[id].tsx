import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useCancelReservation,
  useReservation,
} from '@/features/reservations/hooks/use-reservations';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatDateTime } from '@/lib/format';
import { AppError } from '@/lib/errors';
import { colors, spacing } from '@/constants/theme';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useReservation(id);
  const cancelMutation = useCancelReservation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ErrorState
          message="Impossible de charger la réservation."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const reservation = query.data;
  if (!reservation) {
    return (
      <Screen>
        <EmptyState title="Réservation introuvable" />
      </Screen>
    );
  }

  const canCancel =
    reservation.status === 'PENDING' || reservation.status === 'APPROVED';

  const resourceLabel =
    reservation.resourceType === 'VEHICLE'
      ? reservation.vehicle
        ? `${reservation.vehicle.brand} ${reservation.vehicle.model} (${reservation.vehicle.registrationNumber})`
        : 'Véhicule'
      : reservation.room
        ? reservation.room.name
        : 'Salle';

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(reservation.id);
      setConfirmOpen(false);
      Alert.alert('Réservation annulée', 'Votre réservation a été annulée.');
      void query.refetch();
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Impossible d’annuler la réservation.';
      Alert.alert('Erreur', message);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{resourceLabel}</Text>
        <Badge status={reservation.status} />
      </View>

      <Card style={styles.card}>
        <Row label="Type" value={reservation.resourceType === 'VEHICLE' ? 'Véhicule' : 'Salle'} />
        <Row label="Début" value={formatDateTime(reservation.startAt)} />
        <Row label="Fin" value={formatDateTime(reservation.endAt)} />

        {reservation.resourceType === 'VEHICLE' ? (
          <>
            {reservation.destination ? (
              <Row label="Destination" value={reservation.destination} />
            ) : null}
            {reservation.missionReason ? (
              <Row label="Motif" value={reservation.missionReason} />
            ) : null}
            {reservation.passengerCount != null ? (
              <Row label="Passagers" value={String(reservation.passengerCount)} />
            ) : null}
          </>
        ) : (
          <>
            {reservation.meetingSubject ? (
              <Row label="Objet" value={reservation.meetingSubject} />
            ) : null}
            {reservation.participantCount != null ? (
              <Row label="Participants" value={String(reservation.participantCount)} />
            ) : null}
          </>
        )}

        {reservation.comment ? <Row label="Commentaire" value={reservation.comment} /> : null}

        {reservation.status === 'REJECTED' && reservation.rejectionReason ? (
          <Row label="Motif de rejet" value={reservation.rejectionReason} />
        ) : null}

        {reservation.direction ? (
          <Row label="Direction" value={reservation.direction.name} />
        ) : null}
      </Card>

      {canCancel ? (
        <Button
          title="Annuler la réservation"
          variant="danger"
          onPress={() => setConfirmOpen(true)}
          accessibilityLabel="Annuler la réservation"
          style={styles.cancel}
        />
      ) : null}

      <Button
        title="Retour à la liste"
        variant="ghost"
        onPress={() => router.back()}
        accessibilityLabel="Retour"
      />

      <ConfirmModal
        visible={confirmOpen}
        title="Annuler la réservation ?"
        message="Cette action est définitive. La ressource sera libérée pour la période concernée."
        confirmLabel="Annuler la réservation"
        cancelLabel="Fermer"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => void handleCancel()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  cancel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});

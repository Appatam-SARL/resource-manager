import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import type { Reservation } from '@resource-manager/types';
import { useAuth } from '@/features/auth/auth-provider';
import { useNow } from '@/hooks/use-now';
import { useCancelReservation, useReservation } from '@/features/reservations/hooks/use-reservations';
import { isOpenStatus } from '@/features/reservations/lib/reservation-list';
import {
  canCancelReservation,
  formatDetailDay,
  getCancelErrorMessage,
  getExtensionIneligibility,
  getReservationTiming,
} from '@/features/reservations/lib/reservation-detail';
import { ReservationHeroCard } from '@/features/reservations/components/detail/reservation-hero-card';
import { ReservationTimeCard } from '@/features/reservations/components/detail/reservation-time-card';
import { ReservationActions } from '@/features/reservations/components/detail/reservation-actions';
import { ReservationInfoCard } from '@/features/reservations/components/detail/reservation-info-card';
import { ReservationHistory } from '@/features/reservations/components/detail/reservation-history';
import { ExtendReservationSheet } from '@/features/reservations/components/detail/extend-reservation-sheet';
import {
  ReservationDetailError,
  ReservationDetailSkeleton,
  ReservationNotFound,
  ReservationStatusNotice,
  ReservationSuccessBanner,
} from '@/features/reservations/components/detail/reservation-detail-states';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/app-header';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AppError } from '@/lib/errors';
import { parseApiDate } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';

const SUCCESS_BANNER_MS = 4_000;

function backToReservations() {
  router.replace('/(app)/reservations');
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const now = useNow(30_000);
  const query = useReservation(id);
  const cancelMutation = useCancelReservation();
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), SUCCESS_BANNER_MS);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const header = <AppHeader title="Réservation" showBack showActions={false} />;

  const notFound =
    query.error instanceof AppError && (query.error.status === 404 || query.error.status === 403);

  if (query.isPending) {
    return (
      <Screen padded={false}>
        {header}
        <View style={styles.content}>
          <ReservationDetailSkeleton />
        </View>
      </Screen>
    );
  }

  const reservation = query.data;
  if (!reservation || notFound) {
    return (
      <Screen padded={false}>
        {header}
        {query.isError && !notFound ? (
          <ReservationDetailError onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : (
          <ReservationNotFound onBack={backToReservations} />
        )}
      </Screen>
    );
  }

  const actor = user ? { id: user.id, role: user.role } : null;
  const timing = getReservationTiming(reservation, now);
  const isOpen = isOpenStatus(reservation.status);
  const inProgress = isOpen && timing.phase === 'active';
  const canExtend = getExtensionIneligibility(reservation, now, actor) === null;
  const canCancel = canCancelReservation(reservation, actor);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(reservation.id);
      setConfirmCancelOpen(false);
      setSuccessMessage('Votre réservation a été annulée.');
    } catch (error) {
      setConfirmCancelOpen(false);
      Alert.alert('Annulation impossible', getCancelErrorMessage(error));
    }
  };

  const handleExtended = (updated: Reservation) => {
    setExtendOpen(false);
    const end = parseApiDate(updated.endAt);
    setSuccessMessage(
      `Réservation prolongée jusqu'à ${format(end, 'HH:mm')} (${formatDetailDay(end, now).toLowerCase()}).`,
    );
  };

  return (
    <Screen padded={false}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {successMessage ? <ReservationSuccessBanner message={successMessage} /> : null}

        <ReservationHeroCard reservation={reservation} inProgress={inProgress} />
        <ReservationStatusNotice reservation={reservation} inProgress={inProgress} />
        <ReservationTimeCard timing={timing} now={now} showRelative={isOpen} />

        <ReservationActions
          canExtend={canExtend}
          canCancel={canCancel}
          extendHighlighted={inProgress}
          onExtend={() => setExtendOpen(true)}
          onCancel={() => setConfirmCancelOpen(true)}
        />

        <ReservationInfoCard reservation={reservation} currentUserId={user?.id} />
        <ReservationHistory reservation={reservation} />
      </ScrollView>

      {extendOpen ? (
        <ExtendReservationSheet
          reservation={reservation}
          now={now}
          onClose={() => setExtendOpen(false)}
          onExtended={handleExtended}
        />
      ) : null}

      <ConfirmModal
        visible={confirmCancelOpen}
        title="Annuler la réservation ?"
        message={
          inProgress
            ? 'Cette réservation est en cours. La ressource sera libérée immédiatement. Cette action est définitive.'
            : 'La ressource sera libérée pour cette période. Cette action est définitive.'
        }
        confirmLabel="Annuler la réservation"
        cancelLabel="Conserver"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => void handleCancel()}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
});

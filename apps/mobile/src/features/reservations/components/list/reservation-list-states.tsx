import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CalendarCheck2, CalendarPlus, History, SearchX, WifiOff, type LucideIcon } from 'lucide-react-native';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import type { TemporalSegment } from '@/features/reservations/lib/reservation-list';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

export function ReservationCardSkeleton() {
  return (
    <View style={styles.skeletonCard} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.skeletonTop}>
        <Skeleton width={40} height={40} radius={radius.md} />
        <Skeleton width={72} height={12} />
        <View style={styles.flex} />
        <Skeleton width={88} height={24} radius={radius.xl} />
      </View>
      <View style={styles.skeletonBody}>
        <Skeleton width="65%" height={18} />
        <Skeleton width="35%" height={13} />
      </View>
      <View style={styles.skeletonMeta}>
        <Skeleton width="75%" height={14} />
        <Skeleton width="50%" height={13} />
      </View>
    </View>
  );
}

export function ReservationListSkeleton() {
  return (
    <View style={styles.skeletonList} accessibilityLabel="Chargement de vos réservations" accessible>
      <Skeleton width={110} height={12} />
      <ReservationCardSkeleton />
      <ReservationCardSkeleton />
      <ReservationCardSkeleton />
    </View>
  );
}

type EmptyCopy = { icon: LucideIcon; title: string; description: string; showCreate: boolean };

const SEGMENT_EMPTY: Record<TemporalSegment, EmptyCopy> = {
  upcoming: {
    icon: CalendarPlus,
    title: 'Pas de réservation à venir',
    description: "Vous n'avez aucune réservation planifiée pour le moment.",
    showCreate: true,
  },
  active: {
    icon: CalendarCheck2,
    title: 'Aucune réservation en cours',
    description: 'Vos réservations apparaîtront ici pendant leur créneau.',
    showCreate: false,
  },
  history: {
    icon: History,
    title: 'Votre historique est vide',
    description: 'Vos réservations passées, annulées ou refusées apparaîtront ici.',
    showCreate: false,
  },
};

function getEmptyCopy(
  segment: TemporalSegment,
  resourceType: ResourceType | null,
  status: ReservationStatus | null,
): EmptyCopy {
  if (status) {
    return {
      icon: SearchX,
      title: 'Aucun résultat',
      description: 'Aucune réservation ne correspond à ces filtres.',
      showCreate: false,
    };
  }
  if (resourceType) {
    const base = SEGMENT_EMPTY[segment];
    return {
      ...base,
      title: resourceType === 'VEHICLE' ? 'Aucune réservation de véhicule' : 'Aucune réservation de salle',
    };
  }
  return SEGMENT_EMPTY[segment];
}

type ReservationEmptyStateProps = {
  segment: TemporalSegment;
  resourceType: ResourceType | null;
  status: ReservationStatus | null;
  onCreate: () => void;
  onResetFilters: () => void;
};

export function ReservationEmptyState({
  segment,
  resourceType,
  status,
  onCreate,
  onResetFilters,
}: ReservationEmptyStateProps) {
  const copy = getEmptyCopy(segment, resourceType, status);
  const Icon = copy.icon;
  const hasFilters = Boolean(status || resourceType);

  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon size={28} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle} accessibilityRole="header">
        {copy.title}
      </Text>
      <Text style={styles.stateDescription}>{copy.description}</Text>
      {copy.showCreate ? (
        <Button title="Créer une réservation" onPress={onCreate} style={styles.stateButton} />
      ) : null}
      {hasFilters ? (
        <Button title="Effacer les filtres" variant="ghost" onPress={onResetFilters} />
      ) : null}
    </View>
  );
}

export function ReservationErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <View style={[styles.stateIcon, styles.stateIconError]}>
        <WifiOff size={28} color={colors.danger} />
      </View>
      <Text style={styles.stateTitle} accessibilityRole="header">
        Impossible de charger vos réservations
      </Text>
      <Text style={styles.stateDescription}>Vérifiez votre connexion et réessayez.</Text>
      <Button
        title="Réessayer"
        variant="outline"
        loading={retrying}
        onPress={onRetry}
        style={styles.stateButton}
      />
    </View>
  );
}

export function ReservationListFooter({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.footer} accessibilityLabel="Chargement de réservations supplémentaires">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>Le chargement de la suite a échoué.</Text>
        <Button title="Réessayer" variant="ghost" onPress={onRetry} />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skeletonList: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  skeletonCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  skeletonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonBody: {
    gap: 6,
  },
  skeletonMeta: {
    gap: 8,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  state: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stateIconError: {
    backgroundColor: '#FEE2E2',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  stateButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

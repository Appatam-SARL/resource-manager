import { StyleSheet, Text, View } from 'react-native';
import { CalendarCheck2, SearchX, WifiOff, type LucideIcon } from 'lucide-react-native';
import type { ReservationStatus, ResourceType } from '@resource-manager/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';

export function CalendarAgendaSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Chargement du planning">
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={38} height={13} />
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonCardRow}>
              <Skeleton width={36} height={36} radius={radius.md} />
              <View style={styles.skeletonText}>
                <Skeleton width="70%" height={15} />
                <Skeleton width="45%" height={13} />
              </View>
              <Skeleton width={72} height={22} radius={radius.xl} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

type CalendarEmptyStateProps = {
  resourceType: ResourceType | null;
  status: ReservationStatus | null;
  canCreate: boolean;
  onCreate: () => void;
  onResetFilters: () => void;
};

function getEmptyCopy(resourceType: ResourceType | null, status: ReservationStatus | null) {
  if (status) {
    return {
      icon: SearchX,
      title: 'Aucun résultat',
      description: `Aucune réservation « ${RESERVATION_STATUS_LABELS[status]} » ce jour.`,
    };
  }
  if (resourceType === 'VEHICLE') {
    return { icon: CalendarCheck2, title: 'Aucune réservation de véhicule ce jour.', description: 'Aucun véhicule n’est réservé sur cette journée.' };
  }
  if (resourceType === 'ROOM') {
    return { icon: CalendarCheck2, title: 'Aucune réservation de salle ce jour.', description: 'Aucune salle n’est réservée sur cette journée.' };
  }
  return { icon: CalendarCheck2, title: 'Aucune réservation', description: 'Votre planning est libre pour cette journée.' };
}

export function CalendarEmptyState({ resourceType, status, canCreate, onCreate, onResetFilters }: CalendarEmptyStateProps) {
  const copy = getEmptyCopy(resourceType, status);
  return (
    <CenteredState icon={copy.icon} tone="neutral" title={copy.title} description={copy.description}>
      {canCreate ? <Button title="Créer une réservation" onPress={onCreate} style={styles.button} /> : null}
      {resourceType || status ? (
        <Button title="Effacer les filtres" variant="ghost" onPress={onResetFilters} />
      ) : null}
    </CenteredState>
  );
}

export function CalendarErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <CenteredState
      icon={WifiOff}
      tone="danger"
      title="Impossible de charger le calendrier."
      description="Vérifiez votre connexion et réessayez."
    >
      <Button title="Réessayer" variant="outline" loading={retrying} onPress={onRetry} style={styles.button} />
    </CenteredState>
  );
}

function CenteredState({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  tone: 'neutral' | 'danger';
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
        <Icon size={26} color={tone === 'danger' ? colors.danger : colors.primary} />
      </View>
      <Text style={styles.stateTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  skeletonCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonText: {
    flex: 1,
    gap: 6,
  },
  state: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  stateTitle: {
    fontSize: 17,
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
  button: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});

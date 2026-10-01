import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { CircleCheck, Clock, Radio, SearchX, WifiOff, CircleX, type LucideIcon } from 'lucide-react-native';
import type { Reservation } from '@resource-manager/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

export function ReservationDetailSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Chargement de la réservation">
      <View style={[styles.skeletonCard, styles.skeletonHero]}>
        <Skeleton width={64} height={64} radius={radius.lg} />
        <Skeleton width={80} height={12} />
        <Skeleton width="60%" height={22} />
        <Skeleton width="35%" height={14} />
        <Skeleton width={96} height={24} radius={radius.xl} />
      </View>
      <View style={styles.skeletonCard}>
        <Skeleton width={120} height={12} />
        <View style={styles.skeletonRow}>
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
        </View>
        <Skeleton width="100%" height={6} />
        <Skeleton width="45%" height={14} />
      </View>
      <Skeleton width="100%" height={64} radius={radius.lg} />
    </View>
  );
}

type StateProps = { icon: LucideIcon; tone: 'danger' | 'neutral'; title: string; description: string; action?: { label: string; onPress: () => void; loading?: boolean } };

function CenteredState({ icon: Icon, tone, title, description, action }: StateProps) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
        <Icon size={28} color={tone === 'danger' ? colors.danger : colors.primary} />
      </View>
      <Text style={styles.stateTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {action ? (
        <Button
          title={action.label}
          variant="outline"
          loading={action.loading}
          onPress={action.onPress}
          style={styles.stateButton}
        />
      ) : null}
    </View>
  );
}

export function ReservationDetailError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <CenteredState
      icon={WifiOff}
      tone="danger"
      title="Impossible de charger la réservation"
      description="Vérifiez votre connexion et réessayez."
      action={{ label: 'Réessayer', onPress: onRetry, loading: retrying }}
    />
  );
}

export function ReservationNotFound({ onBack }: { onBack: () => void }) {
  return (
    <CenteredState
      icon={SearchX}
      tone="neutral"
      title="Réservation introuvable"
      description="Elle n'existe plus ou ne fait pas partie de votre périmètre."
      action={{ label: 'Retour à mes réservations', onPress: onBack }}
    />
  );
}

type Notice = { icon: LucideIcon; color: string; background: string; title: string; description?: string };

function getNotice(reservation: Reservation, inProgress: boolean): Notice | null {
  if (inProgress) {
    return {
      icon: Radio,
      color: colors.primary,
      background: '#F0F9F3',
      title: 'Cette réservation est actuellement active.',
    };
  }
  if (reservation.status === 'PENDING') {
    return {
      icon: Clock,
      color: '#B45309',
      background: '#FFFBEB',
      title: 'Demande en attente de validation',
      description: 'Vous serez notifié dès qu’un responsable l’aura traitée.',
    };
  }
  if (reservation.status === 'REJECTED') {
    return {
      icon: CircleX,
      color: colors.danger,
      background: '#FEF2F2',
      title: 'Demande refusée',
      description: reservation.rejectionReason?.trim() ? `Motif : ${reservation.rejectionReason.trim()}` : undefined,
    };
  }
  return null;
}

export function ReservationStatusNotice({ reservation, inProgress }: { reservation: Reservation; inProgress: boolean }) {
  const notice = getNotice(reservation, inProgress);
  if (!notice) return null;
  const Icon = notice.icon;
  return (
    <View style={[styles.notice, { backgroundColor: notice.background }]} accessible>
      <Icon size={18} color={notice.color} />
      <View style={styles.noticeText}>
        <Text style={[styles.noticeTitle, { color: notice.color }]}>{notice.title}</Text>
        {notice.description ? <Text style={styles.noticeDescription}>{notice.description}</Text> : null}
      </View>
    </View>
  );
}

export function ReservationSuccessBanner({ message }: { message: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      style={styles.success}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <CircleCheck size={18} color={colors.white} />
      <Text style={styles.successText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.lg,
  },
  skeletonCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  skeletonHero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  stateIconDanger: {
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  noticeText: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

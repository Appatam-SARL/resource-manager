import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Clock } from 'lucide-react-native';
import type { ReservationStatus } from '@resource-manager/types';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationSuccessProps = {
  status: ReservationStatus;
  resourceName: string;
  scheduleLabel: string;
  onViewReservation: () => void;
  onBackToList: () => void;
};

/** Wording follows the status actually returned by POST /reservations. */
function getSuccessCopy(status: ReservationStatus): { title: string; message: string } {
  if (status === 'APPROVED') {
    return { title: 'Réservation confirmée', message: 'Votre réservation est validée.' };
  }
  return {
    title: 'Demande envoyée',
    message: 'Votre demande de réservation est en attente de validation. Vous serez notifié de la décision.',
  };
}

export function ReservationSuccess({
  status,
  resourceName,
  scheduleLabel,
  onViewReservation,
  onBackToList,
}: ReservationSuccessProps) {
  const insets = useSafeAreaInsets();
  const copy = getSuccessCopy(status);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.duration(320).reduceMotion(ReduceMotion.System)}
          style={styles.badge}
        >
          <Check size={40} color={colors.white} strokeWidth={3} />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(320).delay(120).reduceMotion(ReduceMotion.System)}
          style={styles.texts}
        >
          <Text style={styles.title} accessibilityRole="header">
            {copy.title}
          </Text>
          <Text style={styles.message}>{copy.message}</Text>
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(320).delay(200).reduceMotion(ReduceMotion.System)}
          style={styles.recap}
        >
          <Text style={styles.recapTitle}>{resourceName}</Text>
          <Text style={styles.recapSchedule}>{scheduleLabel}</Text>
          {status === 'PENDING' ? (
            <View style={styles.pending}>
              <Clock size={14} color={colors.warning} />
              <Text style={styles.pendingText}>En attente de validation</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <Button title="Voir la réservation" onPress={onViewReservation} style={styles.primary} />
        <Button title="Retour aux réservations" variant="ghost" onPress={onBackToList} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: colors.primaryMuted,
  },
  texts: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  recap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  recapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recapSchedule: {
    fontSize: 14,
    color: colors.textMuted,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.xl,
    backgroundColor: '#FFFBEB',
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
  actions: {
    gap: spacing.sm,
  },
  primary: {
    minHeight: 56,
  },
});

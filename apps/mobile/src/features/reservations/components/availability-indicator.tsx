import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import {
  CircleCheck,
  CircleDashed,
  RefreshCw,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import type { AvailabilityState } from '@/features/reservations/lib/availability';
import { formatScheduleRange, toDateKey, toTimeKey } from '@/features/reservations/lib/schedule';
import { CONFLICT_MESSAGE } from '@/features/reservations/lib/reservation-errors';
import { parseApiDate } from '@/lib/format';
import { colors, radius, spacing } from '@/constants/theme';

type Conflict = { id: string; startAt: string; endAt: string };

type AvailabilityIndicatorProps = {
  state: AvailabilityState;
  /** "Véhicule" / "Salle" */
  resourceLabel: string;
  /** Feminine agreement for "disponible(e)" wording, e.g. "Salle". */
  feminine: boolean;
  conflicts: Conflict[];
  notBookableReason?: string;
  onRetry: () => void;
  onChangeSchedule: () => void;
};

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { background: string; border: string; icon: string }> = {
  neutral: { background: colors.card, border: colors.border, icon: colors.textMuted },
  success: { background: '#F0F9F3', border: '#B7E4C7', icon: colors.success },
  warning: { background: '#FFFBEB', border: '#FDE68A', icon: colors.warning },
  danger: { background: '#FEF2F2', border: '#FECACA', icon: colors.danger },
};

function formatConflict(conflict: Conflict): string {
  const start = parseApiDate(conflict.startAt);
  const end = parseApiDate(conflict.endAt);
  return formatScheduleRange({
    startDate: toDateKey(start),
    startTime: toTimeKey(start),
    endDate: toDateKey(end),
    endTime: toTimeKey(end),
  });
}

export function AvailabilityIndicator({
  state,
  resourceLabel,
  feminine,
  conflicts,
  notBookableReason,
  onRetry,
  onChangeSchedule,
}: AvailabilityIndicatorProps) {
  if (state === 'hidden') return null;

  const lower = resourceLabel.toLowerCase();
  const article = feminine ? 'Cette' : 'Ce';

  const content: {
    tone: Tone;
    icon: LucideIcon | null;
    title: string;
    description?: string;
    action?: { label: string; onPress: () => void };
  } = (() => {
    switch (state) {
      case 'idle':
        return {
          tone: 'neutral',
          icon: CircleDashed,
          title: 'Disponibilité',
          description: `Sélectionnez ${feminine ? 'une' : 'un'} ${lower} pour vérifier sa disponibilité sur ce créneau.`,
        };
      case 'not-bookable':
        return {
          tone: 'danger',
          icon: Wrench,
          title: `${article} ${lower} ne peut pas être ${feminine ? 'réservée' : 'réservé'}`,
          description: notBookableReason,
        };
      case 'checking':
        return { tone: 'neutral', icon: null, title: 'Vérification de la disponibilité…' };
      case 'available':
        return {
          tone: 'success',
          icon: CircleCheck,
          title: `${resourceLabel} disponible`,
          description: 'Aucune réservation ne chevauche ce créneau.',
        };
      case 'unavailable':
        return {
          tone: 'warning',
          icon: TriangleAlert,
          title: `${article} ${lower} n’est pas disponible sur cette période.`,
          description:
            conflicts.length > 0
              ? `Déjà réservé${feminine ? 'e' : ''} : ${conflicts.slice(0, 2).map(formatConflict).join(' ; ')}`
              : undefined,
          action: { label: 'Modifier l’horaire', onPress: onChangeSchedule },
        };
      case 'conflict':
        return {
          tone: 'warning',
          icon: TriangleAlert,
          title: 'Créneau plus disponible',
          description: CONFLICT_MESSAGE,
          action: { label: 'Modifier l’horaire', onPress: onChangeSchedule },
        };
      case 'error':
        return {
          tone: 'danger',
          icon: TriangleAlert,
          title: 'Impossible de vérifier la disponibilité.',
          description: 'Vous pouvez réessayer ou envoyer la demande : elle sera vérifiée à la validation.',
          action: { label: 'Réessayer', onPress: onRetry },
        };
    }
  })();

  const tone = TONES[content.tone];
  const Icon = content.icon;

  return (
    <Animated.View
      key={state}
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      style={[styles.container, { backgroundColor: tone.background, borderColor: tone.border }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={state === 'unavailable' || state === 'conflict' ? 'alert' : undefined}
    >
      <View style={styles.row}>
        {Icon ? (
          <Icon size={22} color={tone.icon} />
        ) : (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        <View style={styles.body}>
          <Text style={styles.title}>{content.title}</Text>
          {content.description ? <Text style={styles.description}>{content.description}</Text> : null}
        </View>
      </View>
      {content.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={content.action.label}
          onPress={content.action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          {state === 'error' ? <RefreshCw size={16} color={colors.primary} /> : null}
          <Text style={styles.actionText}>{content.action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 22 + spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});

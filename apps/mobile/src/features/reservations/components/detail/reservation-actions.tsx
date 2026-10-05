import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ban, ChevronRight, TimerReset, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationActionsProps = {
  canExtend: boolean;
  canCancel: boolean;
  /** Emphasised when the reservation is in progress. */
  extendHighlighted: boolean;
  onExtend: () => void;
  onCancel: () => void;
};

export function ReservationActions({
  canExtend,
  canCancel,
  extendHighlighted,
  onExtend,
  onCancel,
}: ReservationActionsProps) {
  if (!canExtend && !canCancel) return null;

  return (
    <View style={styles.container}>
      {canExtend ? (
        <ActionRow
          icon={TimerReset}
          title="Prolonger la réservation"
          description="Choisir une nouvelle heure de fin"
          variant={extendHighlighted ? 'primary' : 'default'}
          onPress={onExtend}
        />
      ) : null}
      {canCancel ? (
        <ActionRow
          icon={Ban}
          title="Annuler la réservation"
          description="La ressource sera libérée"
          variant="danger"
          onPress={onCancel}
        />
      ) : null}
    </View>
  );
}

type ActionVariant = 'primary' | 'default' | 'danger';

const VARIANTS: Record<ActionVariant, { background: string; border: string; tile: string; icon: string; title: string; description: string }> = {
  primary: {
    background: colors.primary,
    border: colors.primary,
    tile: 'rgba(255,255,255,0.16)',
    icon: colors.white,
    title: colors.white,
    description: 'rgba(255,255,255,0.8)',
  },
  default: {
    background: colors.card,
    border: colors.border,
    tile: colors.primaryMuted,
    icon: colors.primary,
    title: colors.text,
    description: colors.textMuted,
  },
  danger: {
    background: colors.card,
    border: colors.border,
    tile: '#FEF2F2',
    icon: colors.danger,
    title: colors.danger,
    description: colors.textMuted,
  },
};

function ActionRow({
  icon: Icon,
  title,
  description,
  variant,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  variant: ActionVariant;
  onPress: () => void;
}) {
  const tone = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: tone.background, borderColor: tone.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: tone.tile }]}>
        <Icon size={20} color={tone.icon} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: tone.title }]}>{title}</Text>
        <Text style={[styles.description, { color: tone.description }]}>{description}</Text>
      </View>
      <ChevronRight size={20} color={tone.description} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
  },
});

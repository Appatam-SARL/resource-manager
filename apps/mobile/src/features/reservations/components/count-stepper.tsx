import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Minus, Plus, Users } from 'lucide-react-native';
import { pluralize } from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

type CountStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: { singular: string; plural: string };
  /** Real capacity of the selected resource; unknown until a resource is picked. */
  max?: number;
  capacityLabel?: string;
  /** e.g. "Sélectionnez un véhicule pour connaître sa capacité." */
  missingCapacityHint: string;
  showRemaining?: boolean;
  error?: string;
};

const MIN = 1;
const MAX_WITHOUT_CAPACITY = 99;

export function CountStepper({
  label,
  value,
  onChange,
  unit,
  max,
  capacityLabel,
  missingCapacityHint,
  showRemaining = false,
  error,
}: CountStepperProps) {
  const upperBound = max ?? MAX_WITHOUT_CAPACITY;
  const canDecrement = value > MIN;
  const canIncrement = value < upperBound;
  const overCapacity = max !== undefined && value > max;
  const remaining = max !== undefined ? max - value : null;

  const setValue = (next: number) => onChange(Math.min(Math.max(next, MIN), upperBound));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.control, (overCapacity || error) && styles.controlError]}>
        <StepButton
          icon="minus"
          label={`Retirer un ${unit.singular}`}
          disabled={!canDecrement}
          onPress={() => setValue(value - 1)}
        />
        <View
          style={styles.valueBox}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: MIN, max: upperBound, now: value, text: pluralize(value, unit.singular, unit.plural) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment' && canIncrement) setValue(value + 1);
            if (event.nativeEvent.actionName === 'decrement' && canDecrement) setValue(value - 1);
          }}
        >
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>{value > 1 ? unit.plural : unit.singular}</Text>
        </View>
        <StepButton
          icon="plus"
          label={`Ajouter un ${unit.singular}`}
          disabled={!canIncrement}
          onPress={() => setValue(value + 1)}
        />
      </View>

      {error || overCapacity ? (
        <View style={styles.hintRow} accessibilityRole="alert">
          <AlertCircle size={14} color={colors.danger} />
          <Text style={styles.errorText}>
            {error ?? `Dépasse la capacité (${capacityLabel ?? max}).`}
          </Text>
        </View>
      ) : (
        <View style={styles.hintRow}>
          <Users size={14} color={colors.textMuted} />
          <Text style={styles.hintText}>
            {capacityLabel ?? missingCapacityHint}
            {showRemaining && remaining !== null && remaining > 0
              ? ` · ${pluralize(remaining, 'place restante', 'places restantes')}`
              : null}
            {showRemaining && remaining === 0 ? ' · Complet' : null}
          </Text>
        </View>
      )}
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.stepButton,
        disabled && styles.stepButtonDisabled,
        pressed && styles.stepButtonPressed,
      ]}
    >
      <Icon size={20} color={disabled ? colors.textMuted : colors.primary} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  controlError: {
    borderColor: colors.danger,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    backgroundColor: colors.background,
  },
  stepButtonPressed: {
    opacity: 0.7,
  },
  valueBox: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 13,
    color: colors.textMuted,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
});

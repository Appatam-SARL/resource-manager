import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  /**
   * true (default): `max` is a hard limit (vehicle seats).
   * false: `max` is indicative only (room capacity); exceeding it shows a non-blocking warning.
   */
  enforceMax?: boolean;
  capacityLabel?: string;
  /** Warning shown when `enforceMax` is false and the value exceeds `max`. */
  overCapacityWarning?: string;
  /** e.g. "Sélectionnez un véhicule pour connaître sa capacité." */
  missingCapacityHint: string;
  showRemaining?: boolean;
  error?: string;
};

const MIN = 1;
const MAX_WITHOUT_CAPACITY = 99;
/** Technical bound when capacity is indicative; mirrors the API limit on participantCount. */
const MAX_UNENFORCED = 1000;

export function CountStepper({
  label,
  value,
  onChange,
  unit,
  max,
  enforceMax = true,
  capacityLabel,
  overCapacityWarning,
  missingCapacityHint,
  showRemaining = false,
  error,
}: CountStepperProps) {
  /** Text being typed; null when the field is not being edited. */
  const [draft, setDraft] = useState<string | null>(null);

  const upperBound = enforceMax ? (max ?? MAX_WITHOUT_CAPACITY) : MAX_UNENFORCED;
  const canDecrement = value > MIN;
  const canIncrement = value < upperBound;
  const exceedsCapacity = max !== undefined && value > max;
  const overCapacityError = enforceMax && exceedsCapacity;
  const overCapacityNotice = !enforceMax && exceedsCapacity;
  const remaining = max !== undefined ? max - value : null;

  const clamp = (next: number) => Math.min(Math.max(next, MIN), upperBound);
  const setValue = (next: number) => onChange(clamp(next));

  const changeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, String(upperBound).length);
    if (!digits) {
      setDraft('');
      return;
    }
    const next = clamp(Number.parseInt(digits, 10));
    setDraft(String(next) === digits ? digits : String(next));
    onChange(next);
  };

  const showError = Boolean(error) || overCapacityError;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.control,
          showError ? styles.controlError : overCapacityNotice && styles.controlWarning,
        ]}
      >
        <StepButton
          icon="minus"
          label={`Retirer un ${unit.singular}`}
          disabled={!canDecrement}
          onPress={() => setValue(value - 1)}
        />
        <View style={styles.valueBox}>
          <TextInput
            style={styles.value}
            value={draft ?? String(value)}
            onChangeText={changeText}
            onFocus={() => setDraft(String(value))}
            onBlur={() => setDraft(null)}
            keyboardType="number-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={String(upperBound).length}
            accessibilityLabel={label}
            accessibilityHint={`Saisissez le nombre de ${unit.plural}`}
          />
          <Text style={styles.unit}>{value > 1 ? unit.plural : unit.singular}</Text>
        </View>
        <StepButton
          icon="plus"
          label={`Ajouter un ${unit.singular}`}
          disabled={!canIncrement}
          onPress={() => setValue(value + 1)}
        />
      </View>

      {showError ? (
        <View style={styles.hintRow} accessibilityRole="alert">
          <AlertCircle size={14} color={colors.danger} />
          <Text style={styles.errorText}>
            {error ?? `Dépasse la capacité (${capacityLabel ?? max}).`}
          </Text>
        </View>
      ) : overCapacityNotice ? (
        <View style={styles.hintRow} accessibilityRole="alert">
          <AlertCircle size={14} color={colors.warning} />
          <Text style={styles.warningText}>
            {overCapacityWarning ?? `Dépasse la capacité indiquée (${max}).`}
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
  controlWarning: {
    borderColor: colors.warning,
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
    minWidth: 64,
    paddingVertical: 0,
    textAlign: 'center',
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
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
  },
});

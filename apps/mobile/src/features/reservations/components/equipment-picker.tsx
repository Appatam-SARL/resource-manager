import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Package, Plus, RefreshCw, TriangleAlert } from 'lucide-react-native';
import type { EquipmentAvailability } from '@resource-manager/types';
import {
  maxSelectableQuantity,
  setSelectionQuantity,
  type EquipmentSelection,
} from '@/features/reservations/lib/equipment-selection';
import { pluralize } from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

type EquipmentPickerProps = {
  items: EquipmentAvailability[] | undefined;
  selection: EquipmentSelection;
  onChange: (selection: EquipmentSelection) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Shown instead of the list while the slot is incomplete or invalid. */
  disabledMessage?: string;
};

/** Optional equipment requested with the reservation, bounded by the stock left on the slot. */
export function EquipmentPicker({
  items,
  selection,
  onChange,
  isLoading,
  isError,
  onRetry,
  disabledMessage,
}: EquipmentPickerProps) {
  if (disabledMessage) {
    return <Text style={styles.muted}>{disabledMessage}</Text>;
  }
  if (isError) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Impossible de charger les équipements disponibles.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          hitSlop={6}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <RefreshCw size={14} color={colors.primary} />
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }
  if (!items) {
    return isLoading ? (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.muted}>Vérification des équipements disponibles…</Text>
      </View>
    ) : null;
  }
  if (items.length === 0) {
    return <Text style={styles.muted}>Aucun équipement n’est proposé pour ce type de réservation.</Text>;
  }

  return (
    <View style={styles.list}>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.muted}>Mise à jour des disponibilités…</Text>
        </View>
      ) : null}
      {items.map((item) => (
        <EquipmentRow
          key={item.id}
          item={item}
          value={selection[item.id] ?? 0}
          onChange={(quantity) => onChange(setSelectionQuantity(selection, item.id, quantity))}
        />
      ))}
    </View>
  );
}

export function EquipmentErrorNotice({ message }: { message: string }) {
  return (
    <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={styles.loading}>
        <TriangleAlert size={16} color={colors.danger} />
        <Text style={[styles.errorText, styles.flex]}>{message}</Text>
      </View>
    </View>
  );
}

function EquipmentRow({
  item,
  value,
  onChange,
}: {
  item: EquipmentAvailability;
  value: number;
  onChange: (quantity: number) => void;
}) {
  const max = maxSelectableQuantity(item);
  const soldOut = max === 0 && value === 0;
  const selected = value > 0;

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.icon}>
        <Package size={18} color={soldOut ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, soldOut && styles.nameMuted]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.hint, soldOut && styles.hintDanger]}>
          {soldOut
            ? 'Indisponible sur ce créneau'
            : `${pluralize(item.availableQuantity, 'disponible', 'disponibles')} sur ${item.quantity}`}
        </Text>
      </View>
      {soldOut ? null : (
        <View style={styles.stepper}>
          <StepButton
            icon="minus"
            label={`Retirer une unité : ${item.name}`}
            disabled={value <= 0}
            onPress={() => onChange(value - 1)}
          />
          <Text style={styles.value} accessibilityLabel={`${item.name} : ${value}`}>
            {value}
          </Text>
          <StepButton
            icon="plus"
            label={`Ajouter une unité : ${item.name}`}
            disabled={value >= max}
            onPress={() => onChange(Math.min(value + 1, max))}
          />
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
      style={({ pressed }) => [styles.stepButton, disabled && styles.stepButtonDisabled, pressed && styles.pressed]}
    >
      <Icon size={18} color={disabled ? colors.textMuted : colors.primary} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowSelected: {
    borderColor: colors.primary,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  nameMuted: {
    color: colors.textMuted,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hintDanger: {
    color: colors.danger,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  stepButtonDisabled: {
    backgroundColor: colors.background,
  },
  value: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

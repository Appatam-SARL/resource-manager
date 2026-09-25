import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReservationStatus, ResourceStatus } from '@resource-manager/types';
import {
  colors,
  radius,
  spacing,
  RESERVATION_STATUS_LABELS,
  RESOURCE_STATUS_LABELS,
  statusColor,
} from '@/constants/theme';

type BadgeProps = {
  status: ReservationStatus | ResourceStatus;
  label?: string;
};

function resolveLabel(status: ReservationStatus | ResourceStatus): string {
  if (status in RESERVATION_STATUS_LABELS) {
    return RESERVATION_STATUS_LABELS[status as ReservationStatus];
  }
  return RESOURCE_STATUS_LABELS[status as ResourceStatus];
}

export function Badge({ status, label }: BadgeProps) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label ?? resolveLabel(status)}</Text>
    </View>
  );
}

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
});

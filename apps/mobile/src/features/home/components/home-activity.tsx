import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ban, CheckCheck, CircleCheck, CircleX, Clock3, Inbox, type LucideIcon } from 'lucide-react-native';
import type { ReservationStatus } from '@resource-manager/types';
import type { HomeActivityItem } from '@/features/home/lib/home';
import { ReservationResourceIcon } from '@/features/reservations/components/list/reservation-card';
import { colors, radius, spacing, statusColor } from '@/constants/theme';

const STATUS_ICONS: Record<ReservationStatus, LucideIcon> = {
  PENDING: Clock3,
  APPROVED: CircleCheck,
  REJECTED: CircleX,
  CANCELLED: Ban,
  COMPLETED: CheckCheck,
};

export const HomeActivityRow = memo(function HomeActivityRow({
  entry,
  onPress,
}: {
  entry: HomeActivityItem;
  onPress: (id: string) => void;
}) {
  const { item } = entry;
  const status = item.reservation.status;
  const StatusIcon = STATUS_ICONS[status];
  const tone = statusColor(status);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.typeLabel} ${item.title}, ${item.when.replace('→', 'à')}, ${entry.statusLabel}, ${entry.updatedLabel}`}
      accessibilityHint="Ouvre le détail de la réservation"
      onPress={() => onPress(entry.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ReservationResourceIcon resourceType={item.reservation.resourceType} size={40} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.when} numberOfLines={1}>
          {item.when}
        </Text>
        <View style={styles.statusRow}>
          <StatusIcon size={14} color={tone} />
          <Text style={[styles.status, { color: tone }]} numberOfLines={1}>
            {entry.statusLabel}
          </Text>
          <Text style={styles.updated} numberOfLines={1}>
            · {entry.updatedLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export function HomeActivityEmpty() {
  return (
    <View style={styles.empty}>
      <Inbox size={22} color={colors.textMuted} />
      <Text style={styles.emptyText}>Vos demandes de réservation apparaîtront ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.99 }],
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
  when: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  updated: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
});

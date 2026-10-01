import { StyleSheet, Text, View } from 'react-native';
import { Ban, CheckCheck, CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react-native';
import type { ReservationStatus } from '@resource-manager/types';
import { RESERVATION_STATUS_LABELS, colors, radius } from '@/constants/theme';

const STATUS_STYLES: Record<ReservationStatus, { icon: LucideIcon; color: string; background: string }> = {
  PENDING: { icon: Clock, color: '#B45309', background: '#FFFBEB' },
  APPROVED: { icon: CircleCheck, color: colors.success, background: '#EAF6EE' },
  COMPLETED: { icon: CheckCheck, color: '#374151', background: '#F3F4F6' },
  REJECTED: { icon: CircleX, color: colors.danger, background: '#FEF2F2' },
  CANCELLED: { icon: Ban, color: colors.textMuted, background: '#F3F4F6' },
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { icon: Icon, color, background } = STATUS_STYLES[status];
  const label = RESERVATION_STATUS_LABELS[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: background }]}
      accessible
      accessibilityLabel={`Statut : ${label}`}
    >
      <Icon size={13} color={color} strokeWidth={2.5} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xl,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

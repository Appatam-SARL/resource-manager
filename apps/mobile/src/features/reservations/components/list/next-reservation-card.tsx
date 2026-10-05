import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Car, DoorOpen, MapPin, Presentation } from 'lucide-react-native';
import type { ReservationListItem } from '@/features/reservations/lib/reservation-list';
import { parseApiDate } from '@/lib/format';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';

type NextReservationCardProps = {
  item: ReservationListItem;
  now: Date;
  onPress: (id: string) => void;
};

export function NextReservationCard({ item, now, onPress }: NextReservationCardProps) {
  const { reservation } = item;
  const Icon = reservation.resourceType === 'VEHICLE' ? Car : DoorOpen;
  const ContextIcon = item.context?.kind === 'destination' ? MapPin : Presentation;
  const countdown = `Dans ${formatDistanceStrict(parseApiDate(reservation.startAt), now, { locale: fr })}`;
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Prochaine réservation : ${item.title}, ${item.when}, ${countdown}, statut ${statusLabel}`}
      accessibilityHint="Ouvre le détail de la réservation"
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.countdown}>{countdown}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>
      <View style={styles.identity}>
        <View style={styles.iconTile}>
          <Icon size={20} color={colors.white} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.when} numberOfLines={1}>
            {item.when}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        {item.context ? (
          <View style={styles.context}>
            <ContextIcon size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.contextText} numberOfLines={1}>
              {item.context.text}
            </Text>
          </View>
        ) : (
          <View style={styles.context} />
        )}
        <View style={styles.link}>
          <Text style={styles.linkText}>Voir</Text>
          <ArrowRight size={16} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.primaryLight,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdown: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.primaryMuted,
    textTransform: 'uppercase',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  when: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  context: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});

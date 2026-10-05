import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CalendarClock,
  Car,
  ChevronRight,
  DoorOpen,
  MapPin,
  Presentation,
  UserRound,
} from 'lucide-react-native';
import type { ResourceType } from '@resource-manager/types';
import type { ReservationListItem } from '@/features/reservations/lib/reservation-list';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';
import { ReservationStatusBadge } from './reservation-status-badge';

export function ReservationResourceIcon({
  resourceType,
  highlighted = false,
  size = 40,
}: {
  resourceType: ResourceType;
  highlighted?: boolean;
  size?: number;
}) {
  const Icon = resourceType === 'VEHICLE' ? Car : DoorOpen;
  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size },
        highlighted && styles.iconTileHighlighted,
      ]}
    >
      <Icon size={Math.round(size * 0.5)} color={highlighted ? colors.white : colors.primary} />
    </View>
  );
}

type ReservationCardProps = {
  item: ReservationListItem;
  onPress: (id: string) => void;
};

export const ReservationCard = memo(function ReservationCard({ item, onPress }: ReservationCardProps) {
  const { reservation, inProgress } = item;
  const ContextIcon = item.context?.kind === 'destination' ? MapPin : Presentation;
  const accessibilityLabel = [
    item.typeLabel,
    item.title,
    item.subtitle,
    inProgress ? 'En cours' : null,
    item.when,
    item.context?.text,
    item.requesterName ? `Demandée par ${item.requesterName}` : null,
    `Statut : ${RESERVATION_STATUS_LABELS[reservation.status]}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Ouvre le détail de la réservation"
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, inProgress && styles.cardActive, pressed && styles.cardPressed]}
    >
      <View style={styles.top}>
        <ReservationResourceIcon resourceType={reservation.resourceType} highlighted={inProgress} />
        <View style={styles.topText}>
          {inProgress ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN COURS</Text>
            </View>
          ) : (
            <Text style={styles.type}>{item.typeLabel.toUpperCase()}</Text>
          )}
        </View>
        <ReservationStatusBadge status={reservation.status} />
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <CalendarClock size={15} color={inProgress ? colors.primary : colors.textMuted} />
          <Text style={[styles.when, inProgress && styles.whenActive]} numberOfLines={1}>
            {item.when}
          </Text>
        </View>
        {item.context ? (
          <View style={styles.metaRow}>
            <ContextIcon size={15} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.context.text}
            </Text>
          </View>
        ) : null}
        {item.requesterName ? (
          <View style={styles.metaRow}>
            <UserRound size={15} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.requesterName}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardActive: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F4FAF6',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topText: {
    flex: 1,
  },
  iconTile: {
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileHighlighted: {
    backgroundColor: colors.primary,
  },
  type: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  meta: {
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  when: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  whenActive: {
    color: colors.primary,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
});

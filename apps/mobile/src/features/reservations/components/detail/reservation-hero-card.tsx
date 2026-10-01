import { StyleSheet, Text, View } from 'react-native';
import { Car, DoorOpen } from 'lucide-react-native';
import type { Reservation } from '@resource-manager/types';
import { ReservationStatusBadge } from '@/features/reservations/components/list/reservation-status-badge';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationHeroCardProps = {
  reservation: Reservation;
  inProgress: boolean;
};

export function getReservationResourceTitle(reservation: Reservation): string {
  if (reservation.resourceType === 'VEHICLE') {
    return reservation.vehicle ? `${reservation.vehicle.brand} ${reservation.vehicle.model}` : 'Véhicule';
  }
  return reservation.room?.name ?? 'Salle de réunion';
}

export function ReservationHeroCard({ reservation, inProgress }: ReservationHeroCardProps) {
  const isVehicle = reservation.resourceType === 'VEHICLE';
  const Icon = isVehicle ? Car : DoorOpen;
  const title = getReservationResourceTitle(reservation);
  const subtitle = isVehicle ? reservation.vehicle?.registrationNumber : reservation.room?.location;

  return (
    <View style={[styles.card, inProgress && styles.cardActive]}>
      <View style={[styles.iconTile, inProgress && styles.iconTileActive]}>
        <Icon size={32} color={inProgress ? colors.white : colors.primary} />
      </View>
      <Text style={styles.type}>{isVehicle ? 'VÉHICULE' : 'SALLE DE RÉUNION'}</Text>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.badges}>
        <ReservationStatusBadge status={reservation.status} />
        {inProgress ? (
          <View style={styles.live} accessible accessibilityLabel="En cours">
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN COURS</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardActive: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F4FAF6',
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconTileActive: {
    backgroundColor: colors.primary,
  },
  type: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
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
    letterSpacing: 0.6,
    color: colors.primary,
  },
});

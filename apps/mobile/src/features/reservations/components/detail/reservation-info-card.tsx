import { StyleSheet, Text, View } from 'react-native';
import {
  Building2,
  MapPin,
  MessageSquareText,
  Network,
  Presentation,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import type { Reservation } from '@resource-manager/types';
import { pluralize } from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

type InfoRow = { key: string; icon: LucideIcon; label: string; value: string };

function buildInfoRows(reservation: Reservation, currentUserId: string | undefined): InfoRow[] {
  const rows: InfoRow[] = [];
  if (reservation.resourceType === 'VEHICLE') {
    if (reservation.destination) {
      rows.push({ key: 'destination', icon: MapPin, label: 'Destination', value: reservation.destination });
    }
    if (reservation.missionReason) {
      rows.push({ key: 'mission', icon: Target, label: 'Motif de la mission', value: reservation.missionReason });
    }
    if (reservation.passengerCount != null) {
      const seats = reservation.vehicle?.seats;
      rows.push({
        key: 'passengers',
        icon: Users,
        label: 'Passagers',
        value: seats
          ? `${pluralize(reservation.passengerCount, 'passager', 'passagers')} · ${pluralize(seats, 'place', 'places')}`
          : pluralize(reservation.passengerCount, 'passager', 'passagers'),
      });
    }
  } else {
    if (reservation.meetingSubject) {
      rows.push({ key: 'subject', icon: Presentation, label: 'Objet', value: reservation.meetingSubject });
    }
    if (reservation.participantCount != null) {
      const capacity = reservation.room?.capacity;
      rows.push({
        key: 'participants',
        icon: Users,
        label: 'Participants',
        value: capacity
          ? `${pluralize(reservation.participantCount, 'participant', 'participants')} · capacité ${capacity}`
          : pluralize(reservation.participantCount, 'participant', 'participants'),
      });
    }
  }
  if (reservation.comment) {
    rows.push({ key: 'comment', icon: MessageSquareText, label: 'Commentaire', value: reservation.comment });
  }
  if (reservation.user && reservation.user.id !== currentUserId) {
    rows.push({
      key: 'requester',
      icon: UserRound,
      label: 'Demandeur',
      value: `${reservation.user.firstName} ${reservation.user.lastName}`.trim(),
    });
  }
  if (reservation.company) {
    rows.push({ key: 'company', icon: Building2, label: 'Entreprise', value: reservation.company.name });
  }
  if (reservation.direction) {
    rows.push({ key: 'direction', icon: Network, label: 'Direction', value: reservation.direction.name });
  }
  return rows;
}

export function ReservationInfoCard({
  reservation,
  currentUserId,
}: {
  reservation: Reservation;
  currentUserId: string | undefined;
}) {
  const rows = buildInfoRows(reservation, currentUserId);
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Informations
      </Text>
      <View style={styles.card}>
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <View
              key={row.key}
              style={[styles.row, index > 0 && styles.rowDivider]}
              accessible
              accessibilityLabel={`${row.label} : ${row.value}`}
            >
              <View style={styles.iconTile}>
                <Icon size={17} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  card: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  value: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
});

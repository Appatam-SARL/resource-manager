import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, MoveRight, Presentation, UserRound } from 'lucide-react-native';
import type { AgendaEventRow } from '@/features/calendar/lib/calendar';
import { ReservationResourceIcon } from '@/features/reservations/components/list/reservation-card';
import { ReservationStatusBadge } from '@/features/reservations/components/list/reservation-status-badge';
import { formatDuration } from '@/features/reservations/lib/schedule';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';

type CalendarReservationCardProps = {
  row: AgendaEventRow;
  currentUserId: string | undefined;
  onPress: (id: string) => void;
};

export const CalendarReservationCard = memo(function CalendarReservationCard({
  row,
  currentUserId,
  onPress,
}: CalendarReservationCardProps) {
  const { event, inProgress, isNext } = row;
  const isVehicle = event.resourceType === 'VEHICLE';
  const title = event.resourceName ?? event.title;
  const ContextIcon = isVehicle ? MapPin : Presentation;
  const requester = event.userId && event.userId !== currentUserId ? event.requesterName : undefined;
  const remaining = inProgress
    ? row.minutesLeft <= 1
      ? 'se termine dans moins d’une minute'
      : `se termine dans ${formatDuration(row.minutesLeft)}`
    : null;

  const accessibilityLabel = [
    isVehicle ? 'Véhicule' : 'Salle',
    title,
    event.resourceDetail,
    row.timeRange.replace('→', 'à'),
    row.spanNote,
    inProgress ? `En cours, ${remaining}` : null,
    isNext ? 'Prochaine réservation' : null,
    event.context,
    requester ? `Demandée par ${requester}` : null,
    `Statut : ${RESERVATION_STATUS_LABELS[event.status]}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Ouvre le détail de la réservation"
      onPress={() => onPress(event.id)}
      style={({ pressed }) => [styles.card, inProgress && styles.cardActive, pressed && styles.pressed]}
    >
      {inProgress || isNext ? (
        <View style={styles.tagRow}>
          {inProgress ? (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN COURS</Text>
              <Text style={styles.tagHint} numberOfLines={1}>
                · {remaining}
              </Text>
            </>
          ) : (
            <Text style={styles.nextText}>PROCHAINE</Text>
          )}
        </View>
      ) : null}

      <View style={styles.main}>
        <ReservationResourceIcon resourceType={event.resourceType} highlighted={inProgress} size={36} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.timeRow}>
            <Text style={[styles.time, inProgress && styles.timeActive]}>{row.timeRange}</Text>
            {event.resourceDetail ? (
              <Text style={styles.detail} numberOfLines={1}>
                · {event.resourceDetail}
              </Text>
            ) : null}
          </View>
        </View>
        <ReservationStatusBadge status={event.status} />
      </View>

      {row.spanNote || event.context || requester ? (
        <View style={styles.meta}>
          {row.spanNote ? (
            <View style={styles.metaRow}>
              <MoveRight size={14} color={colors.primary} />
              <Text style={styles.spanText} numberOfLines={1}>
                {row.spanNote}
              </Text>
            </View>
          ) : null}
          {event.context ? (
            <View style={styles.metaRow}>
              <ContextIcon size={14} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.context}
              </Text>
            </View>
          ) : null}
          {requester ? (
            <View style={styles.metaRow}>
              <UserRound size={14} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {requester}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardActive: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F4FAF6',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  tagRow: {
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  tagHint: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  nextText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: colors.primary,
  },
  detail: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  meta: {
    gap: 4,
    paddingLeft: 36 + spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  spanText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});

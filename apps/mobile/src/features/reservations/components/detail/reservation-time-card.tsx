import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Hourglass, Timer } from 'lucide-react-native';
import {
  formatDetailDay,
  formatRemaining,
  formatStartsIn,
  type ReservationTiming,
} from '@/features/reservations/lib/reservation-detail';
import { formatDuration } from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

type ReservationTimeCardProps = {
  timing: ReservationTiming;
  now: Date;
  /** Relative hints only make sense while the reservation is still open. */
  showRelative: boolean;
};

export function ReservationTimeCard({ timing, now, showRelative }: ReservationTimeCardProps) {
  const { start, end, phase, durationMinutes, minutesLeft } = timing;
  const startDay = formatDetailDay(start, now);
  const endDay = formatDetailDay(end, now);
  const startTime = format(start, 'HH:mm');
  const endTime = format(end, 'HH:mm');
  const elapsedRatio =
    phase === 'active' && durationMinutes > 0
      ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (durationMinutes * 60_000)))
      : phase === 'ended'
        ? 1
        : 0;

  const relative =
    showRelative && phase === 'active'
      ? formatRemaining(minutesLeft)
      : showRelative && phase === 'upcoming'
        ? formatStartsIn(minutesLeft)
        : null;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Du ${startDay} à ${startTime} au ${endDay} à ${endTime}, durée ${formatDuration(durationMinutes)}${relative ? `, ${relative}` : ''}`}
    >
      <Text style={styles.label}>VOTRE RÉSERVATION</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.caption}>DÉBUT</Text>
          <Text style={styles.time}>{startTime}</Text>
          <Text style={styles.day}>{startDay}</Text>
        </View>
        <View style={[styles.column, styles.columnEnd]}>
          <Text style={styles.caption}>FIN</Text>
          <Text style={styles.time}>{endTime}</Text>
          <Text style={styles.day}>{endDay}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={styles.line} />
        <View style={[styles.fill, { width: `${elapsedRatio * 100}%` }]} />
        <View style={[styles.dot, styles.dotStart, elapsedRatio > 0 && styles.dotFilled]} />
        <View style={[styles.dot, styles.dotEnd, elapsedRatio >= 1 && styles.dotFilled]} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Hourglass size={15} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Durée : <Text style={styles.footerStrong}>{formatDuration(durationMinutes)}</Text>
          </Text>
        </View>
        {relative ? (
          <View style={styles.footerItem}>
            <Timer size={15} color={phase === 'active' ? colors.primary : colors.textMuted} />
            <Text style={[styles.footerText, phase === 'active' && styles.footerActive]}>{relative}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const DOT = 14;

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    gap: 2,
  },
  columnEnd: {
    alignItems: 'flex-end',
  },
  caption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  time: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  day: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  track: {
    height: DOT,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryMuted,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  dotStart: {
    left: 0,
  },
  dotEnd: {
    right: 0,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerStrong: {
    fontWeight: '700',
    color: colors.text,
  },
  footerActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});

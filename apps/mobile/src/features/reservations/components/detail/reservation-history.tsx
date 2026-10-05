import { StyleSheet, Text, View } from 'react-native';
import { differenceInMinutes } from 'date-fns';
import type { Reservation } from '@resource-manager/types';
import { buildReservationHistory, type HistoryTone } from '@/features/reservations/lib/reservation-detail';
import { formatDateTime, parseApiDate } from '@/lib/format';
import { colors, radius, spacing } from '@/constants/theme';

const TONE_COLORS: Record<HistoryTone, string> = {
  done: colors.success,
  current: colors.warning,
  danger: colors.danger,
  muted: colors.textMuted,
};

export function ReservationHistory({ reservation }: { reservation: Reservation }) {
  const steps = buildReservationHistory(reservation);
  const wasUpdated =
    differenceInMinutes(parseApiDate(reservation.updatedAt), parseApiDate(reservation.createdAt)) >= 1;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Historique de la demande
      </Text>
      <View style={styles.card}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const color = TONE_COLORS[step.tone];
          return (
            <View
              key={step.key}
              style={styles.step}
              accessible
              accessibilityLabel={[step.title, step.description, step.date ? formatDateTime(step.date) : null]
                .filter(Boolean)
                .join(', ')}
            >
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    { borderColor: color },
                    step.tone !== 'current' && { backgroundColor: color },
                  ]}
                />
                {!isLast ? <View style={styles.connector} /> : null}
              </View>
              <View style={[styles.stepBody, !isLast && styles.stepBodySpaced]}>
                <Text style={[styles.stepTitle, step.tone === 'danger' && { color: colors.danger }]}>
                  {step.title}
                </Text>
                {step.description ? <Text style={styles.stepDescription}>{step.description}</Text> : null}
                {step.date ? <Text style={styles.stepDate}>{formatDateTime(step.date)}</Text> : null}
              </View>
            </View>
          );
        })}
        {wasUpdated ? (
          <Text style={styles.updated}>Dernière mise à jour : {formatDateTime(reservation.updatedAt)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const DOT = 12;

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
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: DOT,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  connector: {
    flex: 1,
    width: 2,
    marginTop: 4,
    backgroundColor: colors.border,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepBodySpaced: {
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  stepDate: {
    fontSize: 13,
    color: colors.textMuted,
  },
  updated: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    fontSize: 12,
    color: colors.textMuted,
  },
});

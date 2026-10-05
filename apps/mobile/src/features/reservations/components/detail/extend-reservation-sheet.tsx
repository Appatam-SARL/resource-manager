import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { format } from 'date-fns';
import { ArrowRight, ChevronDown, ChevronUp, CircleCheck, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import type { Reservation } from '@resource-manager/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useAvailability, useExtendReservation } from '@/features/reservations/hooks/use-reservations';
import {
  EXTENSION_QUICK_MINUTES,
  buildExtensionEndOptions,
  describeExtensionConflict,
  formatDetailDay,
  formatEndOption,
  formatExtensionDelta,
  formatQuickExtension,
  getExtendError,
} from '@/features/reservations/lib/reservation-detail';
import { parseApiDate } from '@/lib/format';
import { colors, radius, spacing } from '@/constants/theme';

type ExtendReservationSheetProps = {
  reservation: Reservation;
  now: Date;
  onClose: () => void;
  onExtended: (reservation: Reservation) => void;
};

/** Render conditionally so the selection resets each time the sheet opens. */
export function ExtendReservationSheet({ reservation, now, onClose, onExtended }: ExtendReservationSheetProps) {
  const currentStart = parseApiDate(reservation.startAt);
  const currentEnd = parseApiDate(reservation.endAt);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const extendMutation = useExtendReservation();

  const resourceId = reservation.resourceType === 'VEHICLE' ? reservation.vehicleId : reservation.roomId;
  const availability = useAvailability(
    selectedEnd && resourceId
      ? {
          resourceType: reservation.resourceType,
          resourceId,
          startAt: currentEnd.toISOString(),
          endAt: selectedEnd.toISOString(),
        }
      : null,
  );

  const endOptions = buildExtensionEndOptions(currentEnd);
  const quickOptions = EXTENSION_QUICK_MINUTES.map((minutes) => ({
    minutes,
    end: new Date(currentEnd.getTime() + minutes * 60_000),
  }));

  const checking = Boolean(selectedEnd) && availability.isFetching;
  const unavailable = Boolean(selectedEnd) && !checking && availability.data?.available === false;
  const available = Boolean(selectedEnd) && !checking && availability.data?.available === true;
  const checkFailed = Boolean(selectedEnd) && !checking && availability.isError;
  const conflict = unavailable
    ? describeExtensionConflict(availability.data?.conflicts ?? [], currentEnd, now)
    : null;
  const latestFreeEnd = conflict?.latestFreeEnd ?? null;

  const selectEnd = (end: Date) => {
    setSelectedEnd(end);
    setSubmitError(null);
  };

  const submit = async () => {
    if (!selectedEnd) return;
    setSubmitError(null);
    try {
      const updated = await extendMutation.mutateAsync({
        id: reservation.id,
        newEndAt: selectedEnd.toISOString(),
      });
      onExtended(updated);
    } catch (error) {
      const { kind, message } = getExtendError(error);
      setSubmitError(message);
      if (kind === 'conflict') void availability.refetch();
    }
  };

  const isSameDaySpan = formatDetailDay(currentStart, now) === formatDetailDay(currentEnd, now);
  const currentRange = isSameDaySpan
    ? `${format(currentStart, 'HH:mm')} → ${format(currentEnd, 'HH:mm')}`
    : `${formatDetailDay(currentStart, now)} ${format(currentStart, 'HH:mm')} → ${formatDetailDay(currentEnd, now)} ${format(currentEnd, 'HH:mm')}`;

  return (
    <BottomSheet visible title="Prolonger la réservation" onClose={onClose}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Choisissez la nouvelle heure de fin</Text>

        <View style={styles.compare}>
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>ACTUELLEMENT</Text>
            <Text style={styles.compareValue}>{currentRange}</Text>
          </View>
          <ArrowRight size={18} color={colors.textMuted} />
          <View style={[styles.compareCol, styles.compareColEnd]}>
            <Text style={styles.compareLabel}>NOUVELLE FIN</Text>
            <Text style={[styles.compareValue, selectedEnd ? styles.compareValueNew : styles.compareValueEmpty]}>
              {selectedEnd ? formatEndOption(selectedEnd, currentEnd, now) : '—'}
            </Text>
            {selectedEnd ? <Text style={styles.delta}>{formatExtensionDelta(currentEnd, selectedEnd)}</Text> : null}
          </View>
        </View>

        <Text style={styles.groupTitle}>Durée supplémentaire</Text>
        <View style={styles.quickRow}>
          {quickOptions.map(({ minutes, end }) => {
            const selected = selectedEnd?.getTime() === end.getTime();
            return (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${formatQuickExtension(minutes)}, fin à ${formatEndOption(end, currentEnd, now)}`}
                onPress={() => selectEnd(end)}
                style={({ pressed }) => [styles.quick, selected && styles.quickSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.quickLabel, selected && styles.quickLabelSelected]}>
                  {formatQuickExtension(minutes)}
                </Text>
                <Text style={[styles.quickHint, selected && styles.quickHintSelected]}>
                  {formatEndOption(end, currentEnd, now)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showAllTimes }}
          onPress={() => setShowAllTimes((value) => !value)}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Text style={styles.toggleText}>Choisir une autre heure de fin</Text>
          {showAllTimes ? (
            <ChevronUp size={18} color={colors.primary} />
          ) : (
            <ChevronDown size={18} color={colors.primary} />
          )}
        </Pressable>

        {showAllTimes ? (
          <ScrollView style={styles.timeList} nestedScrollEnabled showsVerticalScrollIndicator>
            <View style={styles.timeGrid}>
              {endOptions.map((end) => {
                const selected = selectedEnd?.getTime() === end.getTime();
                const label = formatEndOption(end, currentEnd, now);
                return (
                  <Pressable
                    key={end.getTime()}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Fin à ${label}`}
                    onPress={() => selectEnd(end)}
                    style={({ pressed }) => [styles.timeSlot, selected && styles.timeSlotSelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.timeSlotText, selected && styles.timeSlotTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {selectedEnd ? (
          <View style={styles.status}>
            {checking ? (
              <StatusBox tone="neutral" title="Vérification de la disponibilité…" />
            ) : available ? (
              <StatusBox
                tone="success"
                icon={CircleCheck}
                title={`Disponible jusqu'à ${formatEndOption(selectedEnd, currentEnd, now)}`}
                description="Aucune réservation ne bloque la période ajoutée."
              />
            ) : unavailable && conflict ? (
              <StatusBox
                tone="warning"
                icon={TriangleAlert}
                title={`Cette ressource n'est pas disponible jusqu'à ${formatEndOption(selectedEnd, currentEnd, now)}.`}
                description={conflict.message}
                action={
                  latestFreeEnd
                    ? {
                        label: `Prolonger jusqu'à ${formatEndOption(latestFreeEnd, currentEnd, now)}`,
                        onPress: () => selectEnd(latestFreeEnd),
                      }
                    : undefined
                }
              />
            ) : checkFailed ? (
              <StatusBox
                tone="danger"
                icon={TriangleAlert}
                title="Impossible de vérifier la disponibilité."
                description="Vous pouvez réessayer ou confirmer : la disponibilité sera contrôlée à l'enregistrement."
                action={{ label: 'Réessayer', onPress: () => void availability.refetch() }}
              />
            ) : null}
          </View>
        ) : null}

        {submitError ? (
          <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <TriangleAlert size={16} color={colors.danger} />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title={selectedEnd ? `Prolonger jusqu'à ${format(selectedEnd, 'HH:mm')}` : 'Prolonger'}
          onPress={() => void submit()}
          loading={extendMutation.isPending}
          disabled={!selectedEnd || checking || unavailable}
        />
      </View>
    </BottomSheet>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { background: string; border: string; icon: string }> = {
  neutral: { background: colors.background, border: colors.border, icon: colors.textMuted },
  success: { background: '#F0F9F3', border: '#B7E4C7', icon: colors.success },
  warning: { background: '#FFFBEB', border: '#FDE68A', icon: colors.warning },
  danger: { background: '#FEF2F2', border: '#FECACA', icon: colors.danger },
};

function StatusBox({
  tone,
  icon: Icon,
  title,
  description,
  action,
}: {
  tone: Tone;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}) {
  const palette = TONES[tone];
  return (
    <Animated.View
      entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
      style={[styles.statusBox, { backgroundColor: palette.background, borderColor: palette.border }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.statusRow}>
        {Icon ? <Icon size={20} color={palette.icon} /> : <ActivityIndicator size="small" color={colors.primary} />}
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{title}</Text>
          {description ? <Text style={styles.statusDescription}>{description}</Text> : null}
        </View>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [styles.statusAction, pressed && styles.pressed]}
        >
          <Text style={styles.statusActionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  compare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  compareCol: {
    flex: 1,
    gap: 2,
  },
  compareColEnd: {
    alignItems: 'flex-end',
  },
  compareLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  compareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  compareValueNew: {
    fontSize: 20,
    color: colors.primary,
  },
  compareValueEmpty: {
    fontSize: 20,
    color: colors.textMuted,
  },
  delta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quick: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  quickSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  quickLabelSelected: {
    color: colors.white,
  },
  quickHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  quickHintSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  timeList: {
    maxHeight: 200,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  timeSlot: {
    minWidth: 76,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  status: {
    marginTop: spacing.lg,
  },
  statusBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statusDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  statusAction: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginLeft: 20 + spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  actions: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
});

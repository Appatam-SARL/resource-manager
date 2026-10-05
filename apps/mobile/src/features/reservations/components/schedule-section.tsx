import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addMinutes } from 'date-fns';
import { AlertCircle, ArrowRight, CalendarDays, ChevronDown, Clock } from 'lucide-react-native';
import { DatePickerSheet } from './date-picker-sheet';
import { TimePickerSheet } from './time-picker-sheet';
import {
  formatDayLabel,
  formatDuration,
  getScheduleDurationMinutes,
  moveScheduleStart,
  parseDateTime,
  SLOT_MINUTES,
  toDateKey,
  toTimeKey,
  type Schedule,
} from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

type Picker = 'startDate' | 'startTime' | 'endDate' | 'endTime';

type ScheduleSectionProps = {
  /** `single-day` for rooms, `multi-day` for vehicles (departure / return). */
  mode: 'single-day' | 'multi-day';
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  defaultDurationMinutes: number;
  error?: string;
};

function nextSlot(dateKey: string, time: string): string | undefined {
  const date = parseDateTime(dateKey, time);
  return date ? toTimeKey(addMinutes(date, SLOT_MINUTES)) : undefined;
}

export function ScheduleSection({
  mode,
  schedule,
  onChange,
  defaultDurationMinutes,
  error,
}: ScheduleSectionProps) {
  const [picker, setPicker] = useState<Picker | null>(null);
  const now = new Date();
  const todayKey = toDateKey(now);
  const duration = getScheduleDurationMinutes(schedule);
  const labels =
    mode === 'multi-day'
      ? { start: 'Départ', end: 'Retour' }
      : { start: 'Début', end: 'Fin' };

  const close = () => setPicker(null);

  const selectStart = (startDate: string, startTime: string) => {
    const moved = moveScheduleStart(schedule, startDate, startTime, defaultDurationMinutes);
    if (mode === 'single-day' && moved.endDate !== startDate) {
      onChange({ ...moved, endDate: startDate, endTime: '23:45' });
    } else {
      onChange(moved);
    }
  };

  const startMinTime = schedule.startDate === todayKey ? toTimeKey(now) : undefined;
  const endMinTime =
    schedule.endDate === schedule.startDate
      ? nextSlot(schedule.startDate, schedule.startTime)
      : undefined;

  return (
    <View style={styles.container}>
      {mode === 'single-day' ? (
        <>
          <DateField
            label="Date"
            dateKey={schedule.startDate}
            now={now}
            onPress={() => setPicker('startDate')}
          />
          <View style={styles.timeRow}>
            <TimeField label={labels.start} time={schedule.startTime} onPress={() => setPicker('startTime')} />
            <ArrowRight size={18} color={colors.textMuted} />
            <TimeField label={labels.end} time={schedule.endTime} onPress={() => setPicker('endTime')} />
          </View>
        </>
      ) : (
        <View style={styles.timeline}>
          <TimelineStop label={labels.start} isFirst>
            <DateField compact label={`Date de ${labels.start.toLowerCase()}`} dateKey={schedule.startDate} now={now} onPress={() => setPicker('startDate')} />
            <TimeField compact label={`Heure de ${labels.start.toLowerCase()}`} time={schedule.startTime} onPress={() => setPicker('startTime')} />
          </TimelineStop>
          <TimelineStop label={labels.end}>
            <DateField compact label={`Date de ${labels.end.toLowerCase()}`} dateKey={schedule.endDate} now={now} onPress={() => setPicker('endDate')} />
            <TimeField compact label={`Heure de ${labels.end.toLowerCase()}`} time={schedule.endTime} onPress={() => setPicker('endTime')} />
          </TimelineStop>
        </View>
      )}

      {error ? (
        <View style={styles.feedback} accessibilityRole="alert">
          <AlertCircle size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : duration && duration > 0 ? (
        <View style={styles.feedback}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={styles.durationText}>Durée : {formatDuration(duration)}</Text>
        </View>
      ) : null}

      {picker === 'startDate' ? (
        <DatePickerSheet
          title={mode === 'multi-day' ? 'Date de départ' : 'Date de la réunion'}
          value={schedule.startDate}
          minDate={todayKey}
          onClose={close}
          onSelect={(date) => {
            selectStart(date, schedule.startTime);
            close();
          }}
        />
      ) : null}
      {picker === 'endDate' ? (
        <DatePickerSheet
          title="Date de retour"
          value={schedule.endDate}
          minDate={schedule.startDate}
          onClose={close}
          onSelect={(date) => {
            onChange({ ...schedule, endDate: date });
            close();
          }}
        />
      ) : null}
      {picker === 'startTime' ? (
        <TimePickerSheet
          title={`Heure de ${labels.start.toLowerCase()}`}
          value={schedule.startTime}
          minTime={startMinTime}
          onClose={close}
          onSelect={(time) => {
            selectStart(schedule.startDate, time);
            close();
          }}
        />
      ) : null}
      {picker === 'endTime' ? (
        <TimePickerSheet
          title={`Heure de ${labels.end.toLowerCase()}`}
          value={schedule.endTime}
          minTime={endMinTime}
          onClose={close}
          onSelect={(time) => {
            onChange({ ...schedule, endTime: time });
            close();
          }}
        />
      ) : null}
    </View>
  );
}

function TimelineStop({
  label,
  isFirst = false,
  children,
}: {
  label: string;
  isFirst?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.stop}>
      <View style={styles.stopRail}>
        <View style={[styles.stopDot, !isFirst && styles.stopDotEnd]} />
        {isFirst ? <View style={styles.stopLine} /> : null}
      </View>
      <View style={styles.stopBody}>
        <Text style={styles.stopLabel}>{label}</Text>
        <View style={styles.stopFields}>{children}</View>
      </View>
    </View>
  );
}

function DateField({
  label,
  dateKey,
  now,
  compact = false,
  onPress,
}: {
  label: string;
  dateKey: string;
  now: Date;
  compact?: boolean;
  onPress: () => void;
}) {
  const { relative, full } = formatDayLabel(dateKey, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${relative} ${full}`}
      accessibilityHint="Ouvre le calendrier"
      onPress={onPress}
      style={({ pressed }) => [styles.field, compact ? styles.dateCompact : styles.dateFull, pressed && styles.fieldPressed]}
    >
      {compact ? null : (
        <View style={styles.iconTile}>
          <CalendarDays size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.fieldBody}>
        <Text style={styles.dateRelative} numberOfLines={1}>
          {relative}
        </Text>
        <Text style={styles.dateFullText} numberOfLines={1}>
          {full}
        </Text>
      </View>
      <ChevronDown size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function TimeField({
  label,
  time,
  compact = false,
  onPress,
}: {
  label: string;
  time: string;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${time}`}
      accessibilityHint="Ouvre la sélection de l’heure"
      onPress={onPress}
      style={({ pressed }) => [styles.field, compact ? styles.timeCompact : styles.timeFull, pressed && styles.fieldPressed]}
    >
      {compact ? null : <Text style={styles.timeLabel}>{label}</Text>}
      <Text style={styles.timeValue}>{time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  field: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  fieldPressed: {
    borderColor: colors.primaryLight,
    backgroundColor: '#F7FBF8',
  },
  dateFull: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateCompact: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBody: {
    flex: 1,
  },
  dateRelative: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dateFullText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeFull: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  timeCompact: {
    minWidth: 84,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeline: {
    gap: spacing.xs,
  },
  stop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stopRail: {
    width: 12,
    alignItems: 'center',
    paddingTop: 5,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  stopDotEnd: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  stopLine: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
    backgroundColor: colors.primaryMuted,
  },
  stopBody: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  stopLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stopFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
  durationText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

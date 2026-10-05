import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useCalendarMonth } from '@/features/calendar/hooks/use-calendar';
import {
  applyCalendarFilters,
  countEventsByDay,
  formatMonthLabel,
  getMonthGrid,
  toDayKey,
  type CalendarFiltersValue,
} from '@/features/calendar/lib/calendar';
import { colors, radius, spacing } from '@/constants/theme';

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type CalendarMonthPickerSheetProps = {
  selectedDate: Date;
  today: Date;
  filters: CalendarFiltersValue;
  minDate: Date;
  maxDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

/** Render conditionally: the displayed month starts on the selected date. */
export function CalendarMonthPickerSheet({
  selectedDate,
  today,
  filters,
  minDate,
  maxDate,
  onSelect,
  onClose,
}: CalendarMonthPickerSheetProps) {
  const [month, setMonth] = useState(() => startOfMonth(selectedDate));
  const query = useCalendarMonth(month);
  const grid = getMonthGrid(month);
  const counts =
    query.data && !query.isPlaceholderData
      ? countEventsByDay(applyCalendarFilters(query.data, filters), grid.flat())
      : null;

  const canGoPrevious = startOfMonth(addMonths(month, -1)) >= startOfMonth(minDate);
  const canGoNext = startOfMonth(addMonths(month, 1)) <= startOfMonth(maxDate);
  const selectedKey = toDayKey(selectedDate);
  const todayKey = toDayKey(today);

  return (
    <BottomSheet visible title="Choisir une date" onClose={onClose}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          disabled={!canGoPrevious}
          onPress={() => setMonth((value) => addMonths(value, -1))}
          style={({ pressed }) => [styles.nav, pressed && styles.pressed, !canGoPrevious && styles.disabled]}
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.monthTitle}>
          <Text style={styles.monthText} accessibilityRole="header">
            {formatMonthLabel(month)}
          </Text>
          {query.isFetching && !counts ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          disabled={!canGoNext}
          onPress={() => setMonth((value) => addMonths(value, 1))}
          style={({ pressed }) => [styles.nav, pressed && styles.pressed, !canGoNext && styles.disabled]}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_HEADERS.map((label, index) => (
          <Text key={index} style={styles.weekday} importantForAccessibility="no">
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((week) => (
          <View key={toDayKey(week[0])} style={styles.week}>
            {week.map((day) => {
              const key = toDayKey(day);
              const inMonth = isSameMonth(day, month);
              const outOfRange = day < minDate || day > maxDate;
              const selected = key === selectedKey;
              const isToday = key === todayKey;
              const count = counts?.get(key) ?? 0;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: outOfRange }}
                  accessibilityLabel={`${format(day, 'EEEE d MMMM yyyy', { locale: fr })}${
                    count > 0 ? `, ${count} réservation${count > 1 ? 's' : ''}` : ''
                  }`}
                  disabled={outOfRange}
                  onPress={() => onSelect(day)}
                  style={({ pressed }) => [
                    styles.cell,
                    isToday && !selected && styles.cellToday,
                    selected && styles.cellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      !inMonth && styles.cellTextMuted,
                      outOfRange && styles.disabled,
                      isToday && !selected && styles.cellTextToday,
                      selected && styles.cellTextSelected,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  <View style={[styles.dot, count > 0 && styles.dotVisible, selected && count > 0 && styles.dotSelected]} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Revenir à aujourd'hui" variant="outline" onPress={() => onSelect(today)} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  nav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  monthTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  grid: {
    gap: 4,
  },
  week: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellToday: {
    borderColor: colors.primary,
  },
  cellSelected: {
    backgroundColor: colors.primary,
  },
  cellText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  cellTextMuted: {
    color: '#9CA3AF',
  },
  cellTextToday: {
    color: colors.primary,
    fontWeight: '800',
  },
  cellTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'transparent',
  },
  dotVisible: {
    backgroundColor: colors.primaryLight,
  },
  dotSelected: {
    backgroundColor: colors.white,
  },
  actions: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.3,
  },
});

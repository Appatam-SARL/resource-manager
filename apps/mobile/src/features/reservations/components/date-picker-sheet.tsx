import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { parseDateTime, toDateKey } from '@/features/reservations/lib/schedule';
import { colors, spacing } from '@/constants/theme';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type DatePickerSheetProps = {
  title: string;
  value: string;
  minDate: string;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
};

/** Render conditionally: the displayed month is initialised from `value` on mount. */
export function DatePickerSheet({ title, value, minDate, onSelect, onClose }: DatePickerSheetProps) {
  const selected = parseDateTime(value);
  const min = parseDateTime(minDate) ?? new Date();
  const [month, setMonth] = useState(() => startOfMonth(selected ?? min));

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const canGoBack = month > startOfMonth(min);
  const today = new Date();
  const monthLabel = format(month, 'MMMM yyyy', { locale: fr });

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => setMonth((m) => addMonths(m, -1))}
          style={({ pressed }) => [styles.navButton, !canGoBack && styles.disabled, pressed && styles.pressed]}
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.monthLabel} accessibilityRole="header">
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          onPress={() => setMonth((m) => addMonths(m, 1))}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekday} importantForAccessibility="no">
            {day}
          </Text>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const disabled = day < min && !isSameDay(day, min);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);
          return (
            <View key={day.toISOString()} style={styles.cell}>
              {inMonth ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'EEEE d MMMM yyyy', { locale: fr })}
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(toDateKey(day))}
                  style={({ pressed }) => [
                    styles.day,
                    isToday && !isSelected && styles.today,
                    isSelected && styles.daySelected,
                    pressed && !isSelected && styles.dayPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextDisabled,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.sm,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    paddingBottom: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  day: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayPressed: {
    backgroundColor: colors.background,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dayTextDisabled: {
    color: colors.border,
  },
  dayTextSelected: {
    color: colors.white,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});

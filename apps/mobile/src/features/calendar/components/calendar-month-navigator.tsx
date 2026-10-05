import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { formatMonthLabel } from '@/features/calendar/lib/calendar';
import { colors, radius, spacing } from '@/constants/theme';

type CalendarMonthNavigatorProps = {
  month: Date;
  isToday: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  onToday: () => void;
};

export function CalendarMonthNavigator({
  month,
  isToday,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onOpenPicker,
  onToday,
}: CalendarMonthNavigatorProps) {
  const label = formatMonthLabel(month);

  return (
    <View style={styles.row}>
      <View style={styles.month}>
        <NavButton label="Mois précédent" disabled={!canGoPrevious} onPress={onPrevious} direction="left" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, choisir une date`}
          onPress={onOpenPicker}
          style={({ pressed }) => [styles.monthLabel, pressed && styles.pressed]}
        >
          <Text style={styles.monthText}>{label}</Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </Pressable>
        <NavButton label="Mois suivant" disabled={!canGoNext} onPress={onNext} direction="right" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Revenir à aujourd'hui"
        accessibilityState={{ selected: isToday }}
        onPress={onToday}
        style={({ pressed }) => [styles.today, isToday && styles.todayActive, pressed && styles.pressed]}
      >
        <CalendarDays size={15} color={isToday ? colors.textMuted : colors.primary} />
        <Text style={[styles.todayText, isToday && styles.todayTextActive]}>Aujourd’hui</Text>
      </Pressable>
    </View>
  );
}

function NavButton({
  label,
  disabled,
  onPress,
  direction,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  direction: 'left' | 'right';
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  month: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    flexShrink: 1,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  today: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  todayActive: {
    borderColor: colors.border,
  },
  todayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  todayTextActive: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.3,
  },
});

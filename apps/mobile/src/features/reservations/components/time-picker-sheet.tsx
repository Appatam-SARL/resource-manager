import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { buildTimeSlots } from '@/features/reservations/lib/schedule';
import { colors, radius, spacing } from '@/constants/theme';

const SLOTS = buildTimeSlots();
const COLUMNS = 4;
const ROW_HEIGHT = 52;

type TimePickerSheetProps = {
  title: string;
  value: string;
  /** Slots strictly before this "HH:mm" are disabled (e.g. already past today). */
  minTime?: string;
  onSelect: (time: string) => void;
  onClose: () => void;
};

export function TimePickerSheet({ title, value, minTime, onSelect, onClose }: TimePickerSheetProps) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(SLOTS.indexOf(value), 0);
  const initialOffset = Math.max(Math.floor(selectedIndex / COLUMNS) * ROW_HEIGHT - ROW_HEIGHT * 2, 0);

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        onLayout={() => scrollRef.current?.scrollTo({ y: initialOffset, animated: false })}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {SLOTS.map((slot) => {
            const disabled = minTime ? slot < minTime : false;
            const selected = slot === value;
            return (
              <View key={slot} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={slot}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(slot)}
                  style={({ pressed }) => [
                    styles.slot,
                    selected && styles.slotSelected,
                    disabled && styles.slotDisabled,
                    pressed && !selected && styles.slotPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selected && styles.slotTextSelected,
                      disabled && styles.slotTextDisabled,
                    ]}
                  >
                    {slot}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: ROW_HEIGHT * 6.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  slot: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.background,
  },
  slotPressed: {
    backgroundColor: colors.background,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  slotTextSelected: {
    color: colors.white,
  },
  slotTextDisabled: {
    color: '#C4C8CE',
  },
});

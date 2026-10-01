import { memo, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatWeekdayShort, getWeekDays, toDayKey } from '@/features/calendar/lib/calendar';
import { colors, radius, spacing } from '@/constants/theme';

type CalendarDateStripProps = {
  weekStarts: Date[];
  selectedWeekIndex: number;
  selectedDate: Date;
  today: Date;
  /** Real reservation counts per day key; hidden while loading. */
  counts: Map<string, number> | null;
  onSelectDate: (date: Date) => void;
  onSwipeToWeek: (weekIndex: number) => void;
};

export function CalendarDateStrip({
  weekStarts,
  selectedWeekIndex,
  selectedDate,
  today,
  counts,
  onSelectDate,
  onSwipeToWeek,
}: CalendarDateStripProps) {
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<Date>>(null);
  const visibleIndex = useRef(selectedWeekIndex);

  useEffect(() => {
    if (width === 0 || visibleIndex.current === selectedWeekIndex) return;
    visibleIndex.current = selectedWeekIndex;
    listRef.current?.scrollToIndex({ index: selectedWeekIndex, animated: true });
  }, [selectedWeekIndex, width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== visibleIndex.current && index >= 0 && index < weekStarts.length) {
      visibleIndex.current = index;
      onSwipeToWeek(index);
    }
  };

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {width > 0 ? (
        <FlatList
          ref={listRef}
          data={weekStarts}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={toDayKey}
          initialScrollIndex={selectedWeekIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={2}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <WeekRow
              weekStart={item}
              width={width}
              selectedKey={toDayKey(selectedDate)}
              todayKey={toDayKey(today)}
              counts={counts}
              onSelectDate={onSelectDate}
            />
          )}
        />
      ) : null}
    </View>
  );
}

const WeekRow = memo(function WeekRow({
  weekStart,
  width,
  selectedKey,
  todayKey,
  counts,
  onSelectDate,
}: {
  weekStart: Date;
  width: number;
  selectedKey: string;
  todayKey: string;
  counts: Map<string, number> | null;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <View style={[styles.week, { width }]} accessibilityRole="tablist">
      {getWeekDays(weekStart).map((day) => {
        const key = toDayKey(day);
        const selected = key === selectedKey;
        const isToday = key === todayKey;
        const count = counts?.get(key) ?? 0;
        const dots = Math.min(count, 3);
        const label = `${format(day, 'EEEE d MMMM', { locale: fr })}${isToday ? ", aujourd'hui" : ''}${
          count > 0 ? `, ${count} réservation${count > 1 ? 's' : ''}` : ''
        }`;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => onSelectDate(day)}
            style={({ pressed }) => [
              styles.day,
              isToday && !selected && styles.dayToday,
              selected && styles.daySelected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text style={[styles.weekday, selected && styles.textSelected, isToday && !selected && styles.todayText]}>
              {formatWeekdayShort(day)}
            </Text>
            <Text style={[styles.number, selected && styles.textSelected, isToday && !selected && styles.todayText]}>
              {format(day, 'd')}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: dots }, (_, index) => (
                <View key={index} style={[styles.dot, selected && styles.dotSelected]} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
  },
  week: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayToday: {
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  weekday: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  number: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  textSelected: {
    color: colors.white,
  },
  todayText: {
    color: colors.primary,
  },
  dots: {
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryLight,
  },
  dotSelected: {
    backgroundColor: colors.white,
  },
});

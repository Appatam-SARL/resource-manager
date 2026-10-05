import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, addMonths, getDay, isSameMonth, startOfDay, startOfMonth } from 'date-fns';
import { useAuth } from '@/features/auth/auth-provider';
import { useNow } from '@/hooks/use-now';
import { useCalendarMonth, usePrefetchCalendarMonth } from '@/features/calendar/hooks/use-calendar';
import {
  DEFAULT_CALENDAR_FILTERS,
  applyCalendarFilters,
  buildDayAgenda,
  buildWeekStarts,
  countEventsByDay,
  findWeekIndex,
  formatAgendaDayTitle,
  getMonthGrid,
  summarizeAgenda,
  toDayKey,
  toMonthKey,
  type CalendarFiltersValue,
} from '@/features/calendar/lib/calendar';
import { CalendarMonthNavigator } from '@/features/calendar/components/calendar-month-navigator';
import { CalendarDateStrip } from '@/features/calendar/components/calendar-date-strip';
import { CalendarMonthPickerSheet } from '@/features/calendar/components/calendar-month-picker-sheet';
import { CalendarFilterSheet } from '@/features/calendar/components/calendar-filter-sheet';
import { CalendarAgenda } from '@/features/calendar/components/calendar-agenda';
import {
  CalendarAgendaSkeleton,
  CalendarEmptyState,
  CalendarErrorState,
} from '@/features/calendar/components/calendar-states';
import { ReservationFilterBar } from '@/features/reservations/components/list/reservation-filters';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/app-header';
import { HeaderActionsWithAdd, openNewReservation } from '@/components/layout/header-add-button';
import { colors, spacing } from '@/constants/theme';

function openReservation(id: string) {
  router.push(`/(app)/reservations/${id}`);
}

function mondayOffset(date: Date): number {
  return (getDay(date) + 6) % 7;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const now = useNow(60_000);
  const today = startOfDay(now);
  const [weekStarts] = useState(() => buildWeekStarts(new Date()));
  const minDate = weekStarts[0];
  const maxDate = addDays(weekStarts[weekStarts.length - 1], 6);

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<CalendarFiltersValue>(DEFAULT_CALENDAR_FILTERS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const query = useCalendarMonth(selectedDate);
  const prefetchMonth = usePrefetchCalendarMonth();
  const selectedWeekIndex = findWeekIndex(weekStarts, selectedDate);

  const selectedMonthKey = toMonthKey(selectedDate);
  useEffect(() => {
    const previousWeek = weekStarts[selectedWeekIndex - 1];
    const nextWeek = weekStarts[selectedWeekIndex + 1];
    const selectedMonth = startOfMonth(selectedDate);
    if (previousWeek && !isSameMonth(previousWeek, selectedMonth)) prefetchMonth(previousWeek);
    if (nextWeek && !isSameMonth(addDays(nextWeek, 6), selectedMonth)) prefetchMonth(addDays(nextWeek, 6));
    // Only re-run when the visible week or month changes, not on every day tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekIndex, selectedMonthKey]);

  const selectDate = (date: Date) => {
    const day = startOfDay(date);
    if (day < minDate) setSelectedDate(minDate);
    else if (day > maxDate) setSelectedDate(startOfDay(maxDate));
    else setSelectedDate(day);
  };

  const goToMonth = (offset: number) => {
    const target = startOfMonth(addMonths(selectedDate, offset));
    selectDate(isSameMonth(target, today) ? today : target);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const isLoaded = query.data !== undefined && !query.isPlaceholderData;
  const events = isLoaded ? applyCalendarFilters(query.data ?? [], filters) : [];
  const counts = isLoaded ? countEventsByDay(events, getMonthGrid(selectedDate).flat()) : null;
  const rows = isLoaded ? buildDayAgenda(events, selectedDate, now) : [];
  const dayTitle = formatAgendaDayTitle(selectedDate, now);
  const summary = isLoaded ? summarizeAgenda(rows) : null;
  const isToday = toDayKey(selectedDate) === toDayKey(today);
  const showError = query.isError && query.data === undefined;

  const agendaHeader = (
    <View style={styles.dayHeader}>
      <Text style={styles.dayTitle} accessibilityRole="header">
        {dayTitle.title}
      </Text>
      <Text style={styles.daySubtitle}>
        {summary ? `${dayTitle.subtitle} · ${summary}` : dayTitle.subtitle}
      </Text>
    </View>
  );

  const agendaEmpty = !isLoaded ? (
    <CalendarAgendaSkeleton />
  ) : (
    <CalendarEmptyState
      resourceType={filters.resourceType}
      status={filters.status}
      canCreate={selectedDate >= today}
      onCreate={openNewReservation}
      onResetFilters={() => setFilters(DEFAULT_CALENDAR_FILTERS)}
    />
  );

  return (
    <Screen padded={false}>
      <AppHeader
        title="Calendrier"
        subtitle="Votre planning de réservations"
        right={<HeaderActionsWithAdd />}
      />

      <View style={styles.controls}>
        <CalendarMonthNavigator
          month={selectedDate}
          isToday={isToday}
          canGoPrevious={startOfMonth(selectedDate) > minDate}
          canGoNext={startOfMonth(addMonths(selectedDate, 1)) <= maxDate}
          onPrevious={() => goToMonth(-1)}
          onNext={() => goToMonth(1)}
          onOpenPicker={() => setPickerOpen(true)}
          onToday={() => selectDate(today)}
        />
        <CalendarDateStrip
          weekStarts={weekStarts}
          selectedWeekIndex={selectedWeekIndex}
          selectedDate={selectedDate}
          today={today}
          counts={counts}
          onSelectDate={selectDate}
          onSwipeToWeek={(index) => selectDate(addDays(weekStarts[index], mondayOffset(selectedDate)))}
        />
        <ReservationFilterBar
          value={filters}
          onChange={setFilters}
          onOpenSheet={() => setFilterSheetOpen(true)}
          activeSheetFilters={filters.status ? 1 : 0}
        />
      </View>

      {showError ? (
        <CalendarErrorState onRetry={() => void refresh()} retrying={refreshing} />
      ) : (
        <CalendarAgenda
          rows={rows}
          currentUserId={user?.id}
          header={agendaHeader}
          empty={agendaEmpty}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          onOpenReservation={openReservation}
        />
      )}

      {pickerOpen ? (
        <CalendarMonthPickerSheet
          selectedDate={selectedDate}
          today={today}
          filters={filters}
          minDate={minDate}
          maxDate={maxDate}
          onClose={() => setPickerOpen(false)}
          onSelect={(date) => {
            selectDate(date);
            setPickerOpen(false);
          }}
        />
      ) : null}

      {filterSheetOpen ? (
        <CalendarFilterSheet
          value={filters}
          onClose={() => setFilterSheetOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setFilterSheetOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayHeader: {
    gap: 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  daySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

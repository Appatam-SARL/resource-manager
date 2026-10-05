import type { ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { AgendaRow } from '@/features/calendar/lib/calendar';
import { colors, spacing } from '@/constants/theme';
import { CalendarReservationCard } from './calendar-reservation-card';

type CalendarAgendaProps = {
  rows: AgendaRow[];
  currentUserId: string | undefined;
  header: ReactElement;
  empty: ReactElement | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenReservation: (id: string) => void;
};

export function CalendarAgenda({
  rows,
  currentUserId,
  header,
  empty,
  refreshing,
  onRefresh,
  onOpenReservation,
}: CalendarAgendaProps) {
  let lastEventIndex = -1;
  rows.forEach((row, index) => {
    if (row.kind === 'event') lastEventIndex = index;
  });

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={9}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={({ item, index }) => {
        if (item.kind === 'now') {
          return (
            <View style={styles.nowRow} accessible accessibilityLabel={item.label}>
              <View style={styles.nowRail}>
                <Text style={styles.nowLabel}>{item.label.replace('Maintenant · ', '')}</Text>
              </View>
              <View style={styles.nowDot} />
              <View style={styles.nowLine} />
              <Text style={styles.nowText}>Maintenant</Text>
            </View>
          );
        }
        return (
          <View style={styles.row}>
            <View style={styles.rail}>
              <Text style={[styles.time, item.inProgress && styles.timeActive]}>{item.railLabel}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.dot, item.inProgress && styles.dotActive]} />
              {index < lastEventIndex ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.cardWrapper}>
              <CalendarReservationCard row={item} currentUserId={currentUserId} onPress={onOpenReservation} />
            </View>
          </View>
        );
      }}
    />
  );
}

const RAIL = 46;
const TRACK = 14;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
  },
  rail: {
    width: RAIL,
    paddingTop: spacing.md,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: colors.primary,
  },
  track: {
    width: TRACK,
    alignItems: 'center',
    paddingTop: spacing.md + 3,
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    backgroundColor: colors.background,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -spacing.md - 3,
    backgroundColor: colors.border,
  },
  cardWrapper: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nowRail: {
    width: RAIL,
  },
  nowLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    fontVariant: ['tabular-nums'],
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: (TRACK - 10) / 2,
    backgroundColor: colors.danger,
  },
  nowLine: {
    flex: 1,
    height: 2,
    marginLeft: spacing.sm,
    backgroundColor: colors.danger,
    opacity: 0.6,
  },
  nowText: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
});

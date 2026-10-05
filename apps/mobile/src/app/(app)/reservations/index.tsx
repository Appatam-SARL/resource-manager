import { useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { useNow } from '@/hooks/use-now';
import { useReservationTimeline } from '@/features/reservations/hooks/use-reservation-timeline';
import type { TemporalSegment } from '@/features/reservations/lib/reservation-list';
import { ReservationCard } from '@/features/reservations/components/list/reservation-card';
import { NextReservationCard } from '@/features/reservations/components/list/next-reservation-card';
import { ReservationSegmentedControl } from '@/features/reservations/components/list/reservation-segmented-control';
import {
  DEFAULT_RESERVATION_FILTERS,
  countSheetFilters,
  ReservationFilterBar,
  ReservationFilterSheet,
  type ReservationFiltersValue,
} from '@/features/reservations/components/list/reservation-filters';
import {
  ReservationEmptyState,
  ReservationErrorState,
  ReservationListFooter,
  ReservationListSkeleton,
} from '@/features/reservations/components/list/reservation-list-states';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/app-header';
import { HeaderActionsWithAdd, openNewReservation } from '@/components/layout/header-add-button';
import { colors, radius, spacing } from '@/constants/theme';

function openReservation(id: string) {
  router.push(`/(app)/reservations/${id}`);
}

export default function ReservationsListScreen() {
  const { user } = useAuth();
  const now = useNow(60_000);
  const [filters, setFilters] = useState<ReservationFiltersValue>(DEFAULT_RESERVATION_FILTERS);
  const [selectedSegment, setSelectedSegment] = useState<TemporalSegment | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const canChangeScope = Boolean(user && user.role !== 'EMPLOYEE');
  const timeline = useReservationTimeline({
    filters,
    segment: selectedSegment,
    currentUserId: user?.id,
    now,
  });

  const header = (
    <AppHeader
      title="Mes réservations"
      subtitle={
        filters.scope === 'scope'
          ? 'Réservations de votre périmètre'
          : 'Suivez vos demandes et réservations'
      }
      right={<HeaderActionsWithAdd />}
    />
  );

  const controls = (
    <View style={styles.controls}>
      <ReservationSegmentedControl
        value={timeline.segment}
        onChange={setSelectedSegment}
        counts={timeline.counts}
      />
      <ReservationFilterBar
        value={filters}
        onChange={setFilters}
        onOpenSheet={() => setFilterSheetOpen(true)}
        activeSheetFilters={countSheetFilters(filters)}
      />
    </View>
  );

  const resetFilters = () => setFilters({ ...DEFAULT_RESERVATION_FILTERS, scope: filters.scope });

  let body;
  if (timeline.isError) {
    body = <ReservationErrorState onRetry={timeline.retry} retrying={timeline.isRetrying} />;
  } else if (timeline.isInitialLoading) {
    body = (
      <View style={styles.listPadding}>
        <ReservationListSkeleton />
      </View>
    );
  } else {
    body = (
      <SectionList
        sections={timeline.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={timeline.refreshing}
            onRefresh={() => void timeline.refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={timeline.loadMoreHistory}
        onEndReachedThreshold={0.4}
        initialNumToRender={8}
        windowSize={9}
        ListHeaderComponent={
          timeline.nextItem ? (
            <View style={styles.nextBlock}>
              <Text style={styles.nextLabel} accessibilityRole="header">
                PROCHAINE RÉSERVATION
              </Text>
              <NextReservationCard item={timeline.nextItem} now={now} onPress={openReservation} />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ReservationCard item={item} onPress={openReservation} />
          </View>
        )}
        ListEmptyComponent={
          timeline.isEmpty ? (
            <ReservationEmptyState
              segment={timeline.segment}
              resourceType={filters.resourceType}
              status={filters.status}
              onCreate={openNewReservation}
              onResetFilters={resetFilters}
            />
          ) : null
        }
        ListFooterComponent={
          <ReservationListFooter
            loading={timeline.isFetchingMore}
            error={timeline.loadMoreFailed}
            onRetry={timeline.retryNextPage}
          />
        }
      />
    );
  }

  return (
    <Screen padded={false}>
      {header}
      {controls}
      {body}
      {filterSheetOpen ? (
        <ReservationFilterSheet
          value={filters}
          canChangeScope={canChangeScope}
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
    paddingBottom: spacing.md,
  },
  listPadding: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  nextBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: '#E8EAED',
    overflow: 'hidden',
  },
  item: {
    marginBottom: spacing.md,
  },
});

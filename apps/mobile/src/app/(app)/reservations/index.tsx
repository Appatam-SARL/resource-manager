import { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { Reservation, ReservationStatus } from '@resource-manager/types';
import { useReservations } from '@/features/reservations/hooks/use-reservations';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';

type StatusFilter = '' | ReservationStatus;

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Toutes', value: '' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Approuvées', value: 'APPROVED' },
  { label: 'Rejetées', value: 'REJECTED' },
  { label: 'Annulées', value: 'CANCELLED' },
  { label: 'Terminées', value: 'COMPLETED' },
];

function reservationTitle(item: Reservation): string {
  if (item.resourceType === 'VEHICLE' && item.vehicle) {
    return `${item.vehicle.brand} ${item.vehicle.model}`;
  }
  if (item.resourceType === 'ROOM' && item.room) {
    return item.room.name;
  }
  return item.resourceType === 'VEHICLE' ? 'Véhicule' : 'Salle';
}

export default function ReservationsListScreen() {
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const query = useReservations({
    page,
    limit: 15,
    status: status || undefined,
  });

  if (query.isLoading && !query.data) {
    return (
      <Screen>
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <ErrorState
          message="Impossible de charger les réservations."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  const canLoadMore = meta ? page < meta.totalPages : false;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              setPage(1);
              void query.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Réservations</Text>
              <Button
                title="Nouvelle"
                onPress={() => router.push('/(app)/reservations/new')}
                accessibilityLabel="Nouvelle réservation"
                style={styles.newBtn}
              />
            </View>
            <View style={styles.chips}>
              {FILTERS.map((f) => (
                <Chip
                  key={f.value || 'all'}
                  label={f.label}
                  active={status === f.value}
                  onPress={() => {
                    setStatus(f.value);
                    setPage(1);
                  }}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune réservation"
            description="Vos réservations apparaîtront ici."
          />
        }
        ListFooterComponent={
          meta && meta.totalPages > 1 ? (
            <View style={styles.pagination}>
              <Button
                title="Précédent"
                variant="outline"
                disabled={page <= 1 || query.isFetching}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                accessibilityLabel="Page précédente"
                style={styles.pageBtn}
              />
              <Text style={styles.pageLabel}>
                {page} / {meta.totalPages}
              </Text>
              <Button
                title="Suivant"
                variant="outline"
                disabled={!canLoadMore || query.isFetching}
                onPress={() => setPage((p) => p + 1)}
                accessibilityLabel="Page suivante"
                style={styles.pageBtn}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => router.push(`/(app)/reservations/${item.id}`)}
            accessibilityLabel={reservationTitle(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{reservationTitle(item)}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.resourceType === 'VEHICLE' ? 'Véhicule' : 'Salle'}
            </Text>
            <Text style={styles.meta}>
              {formatDateTime(item.startAt)} → {formatDateTime(item.endAt)}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  newBtn: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  pageBtn: {
    flex: 1,
    minHeight: 42,
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

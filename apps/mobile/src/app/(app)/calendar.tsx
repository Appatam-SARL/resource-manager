import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import type { ResourceType } from '@resource-manager/types';
import { useCalendar } from '@/features/calendar/hooks/use-calendar';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';

type FilterType = '' | ResourceType;

export default function CalendarScreen() {
  const [resourceType, setResourceType] = useState<FilterType>('');

  const range = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      label: `${format(start, 'dd/MM')} – ${format(end, 'dd/MM/yyyy')}`,
    };
  }, []);

  const query = useCalendar({
    startDate: range.startDate,
    endDate: range.endDate,
    resourceType: resourceType || undefined,
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
          message="Impossible de charger le calendrier."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const events = query.data ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Calendrier</Text>
            <Text style={styles.subtitle}>Semaine du {range.label}</Text>
            <View style={styles.chips}>
              <Chip
                label="Tous"
                active={resourceType === ''}
                onPress={() => setResourceType('')}
              />
              <Chip
                label="Véhicules"
                active={resourceType === 'VEHICLE'}
                onPress={() => setResourceType('VEHICLE')}
              />
              <Chip
                label="Salles"
                active={resourceType === 'ROOM'}
                onPress={() => setResourceType('ROOM')}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucun événement"
            description="Aucune réservation sur cette période."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => router.push(`/(app)/reservations/${item.id}`)}
            accessibilityLabel={item.title}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.resourceType === 'VEHICLE' ? 'Véhicule' : 'Salle'}
            </Text>
            <Text style={styles.meta}>
              {formatDateTime(item.start)} → {formatDateTime(item.end)}
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
});

import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Car, DoorOpen } from 'lucide-react-native';
import type { Reservation } from '@resource-manager/types';
import { useAuth } from '@/features/auth/auth-provider';
import {
  useDashboardReservations,
  useDashboardSummary,
} from '@/features/dashboard/hooks/use-dashboard';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FadeIn, StaggerItem } from '@/components/motion';
import { formatDateTime } from '@/lib/format';
import { colors, radius, spacing } from '@/constants/theme';

function reservationTitle(item: Reservation): string {
  if (item.resourceType === 'VEHICLE' && item.vehicle) {
    return `${item.vehicle.brand} ${item.vehicle.model}`;
  }
  if (item.resourceType === 'ROOM' && item.room) {
    return item.room.name;
  }
  return item.resourceType === 'VEHICLE' ? 'Véhicule' : 'Salle';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const summaryQuery = useDashboardSummary();
  const reservationsQuery = useDashboardReservations(8);

  const refreshing = summaryQuery.isRefetching || reservationsQuery.isRefetching;

  const onRefresh = useCallback(() => {
    void summaryQuery.refetch();
    void reservationsQuery.refetch();
  }, [summaryQuery, reservationsQuery]);

  if ((summaryQuery.isLoading || reservationsQuery.isLoading) && !summaryQuery.data) {
    return (
      <Screen>
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Screen>
        <ErrorState
          message="Impossible de charger le tableau de bord."
          onRetry={() => void summaryQuery.refetch()}
        />
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const reservations = reservationsQuery.data ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <FadeIn>
          <View style={styles.headerBlock}>
            <Text style={styles.greeting}>Bonjour {user?.firstName}</Text>
            <Text style={styles.org}>
              {user?.company.name}
              {user?.direction ? ` · ${user.direction.name}` : ''}
            </Text>

            <View style={styles.statsRow}>
              <StaggerItem index={0} style={{ flex: 1 }}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{summary?.reservations.pending ?? 0}</Text>
                <Text style={styles.statLabel}>En attente</Text>
              </Card>
              </StaggerItem>
              <StaggerItem index={1} style={{ flex: 1 }}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{summary?.reservations.approved ?? 0}</Text>
                <Text style={styles.statLabel}>Approuvées</Text>
              </Card>
              </StaggerItem>
            </View>

            <View style={styles.ctaRow}>
              <Button
                title="Réserver véhicule"
                onPress={() => router.push('/(app)/reservations/new?type=VEHICLE')}
                style={styles.cta}
                accessibilityLabel="Réserver un véhicule"
              />
              <Button
                title="Réserver salle"
                variant="outline"
                onPress={() => router.push('/(app)/reservations/new?type=ROOM')}
                style={styles.cta}
                accessibilityLabel="Réserver une salle"
              />
            </View>

            <View style={styles.quickLinks}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voir les véhicules"
                style={styles.quickLink}
                onPress={() => router.push('/(app)/vehicles')}
              >
                <Car size={20} color={colors.primary} />
                <Text style={styles.quickLinkText}>Véhicules</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voir les salles"
                style={styles.quickLink}
                onPress={() => router.push('/(app)/rooms')}
              >
                <DoorOpen size={20} color={colors.primary} />
                <Text style={styles.quickLinkText}>Salles</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Mes prochaines réservations</Text>
          </View>
          </FadeIn>
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune réservation à venir"
            description="Créez une réservation de véhicule ou de salle pour commencer."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
          <Card
            style={styles.reservationCard}
            onPress={() => router.push(`/(app)/reservations/${item.id}`)}
            accessibilityLabel={`Réservation ${reservationTitle(item)}`}
          >
            <View style={styles.reservationHeader}>
              <Text style={styles.reservationTitle}>{reservationTitle(item)}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.reservationMeta}>
              {formatDateTime(item.startAt)} → {formatDateTime(item.endAt)}
            </Text>
          </Card>
          </StaggerItem>
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
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  org: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  ctaRow: {
    gap: spacing.sm,
  },
  cta: {
    width: '100%',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  quickLinkText: {
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  reservationCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reservationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reservationMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

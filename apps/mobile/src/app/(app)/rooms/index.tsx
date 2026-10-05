import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useRooms } from '@/features/rooms/hooks/use-rooms';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing } from '@/constants/theme';

export default function RoomsListScreen() {
  const query = useRooms({ page: 1, limit: 100, scope: 'group' });

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
          message="Impossible de charger les salles."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const items = query.data?.data ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <EmptyState
            title="Aucune salle"
            description="Aucune salle n’est disponible dans le Groupe."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => router.push(`/(app)/rooms/${item.id}`)}
            accessibilityLabel={item.name}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{item.name}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>{item.location ?? 'Sans lieu précisé'}</Text>
            <Text style={styles.meta}>{item.capacity} places</Text>
            {item.company ? <Text style={styles.meta}>Gérée par {item.company.name}</Text> : null}
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
  card: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
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

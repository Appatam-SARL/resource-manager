import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { useVehicleImageSource } from '@/features/vehicles/hooks/use-vehicle-image-source';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radius, spacing } from '@/constants/theme';

export default function VehiclesListScreen() {
  const query = useVehicles({ page: 1, limit: 100, scope: 'group' });
  const vehicleImageSource = useVehicleImageSource();

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
          message="Impossible de charger les véhicules."
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
            title="Aucun véhicule"
            description="Aucun véhicule n’est disponible dans le Groupe."
          />
        }
        renderItem={({ item }) => {
          const imageSource = vehicleImageSource(item);
          return (
          <Card
            style={styles.card}
            onPress={() => router.push(`/(app)/vehicles/${item.id}`)}
            accessibilityLabel={`${item.brand} ${item.model}`}
          >
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.photo}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View style={styles.header}>
              <Text style={styles.title}>
                {item.brand} {item.model}
              </Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.meta}>{item.registrationNumber}</Text>
            <Text style={styles.meta}>{item.seats} places</Text>
            {item.company ? <Text style={styles.meta}>Géré par {item.company.name}</Text> : null}
          </Card>
          );
        }}
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
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
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

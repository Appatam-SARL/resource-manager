import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useVehicle } from '@/features/vehicles/hooks/use-vehicles';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing } from '@/constants/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useVehicle(id);

  if (query.isLoading) {
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
          message="Impossible de charger le véhicule."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const vehicle = query.data;
  if (!vehicle) {
    return (
      <Screen>
        <EmptyState title="Véhicule introuvable" />
      </Screen>
    );
  }

  const canReserve = vehicle.status === 'AVAILABLE';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Badge status={vehicle.status} />
      </View>

      <Card style={styles.card}>
        <Row label="Immatriculation" value={vehicle.registrationNumber} />
        <Row label="Places" value={String(vehicle.seats)} />
        {vehicle.company ? <Row label="Entreprise" value={vehicle.company.name} /> : null}
        {vehicle.description ? (
          <Row label="Description" value={vehicle.description} />
        ) : null}
      </Card>

      {canReserve ? (
        <Button
          title="Réserver ce véhicule"
          onPress={() =>
            router.push(`/(app)/reservations/new?type=VEHICLE&vehicleId=${vehicle.id}`)
          }
          accessibilityLabel="Réserver ce véhicule"
          style={styles.action}
        />
      ) : (
        <Text style={styles.unavailable}>
          Ce véhicule n’est pas réservable actuellement.
        </Text>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: colors.text,
  },
  action: {
    marginTop: spacing.xl,
  },
  unavailable: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 14,
  },
});

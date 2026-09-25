import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRoom } from '@/features/rooms/hooks/use-rooms';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing } from '@/constants/theme';

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRoom(id);

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
          message="Impossible de charger la salle."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const room = query.data;
  if (!room) {
    return (
      <Screen>
        <EmptyState title="Salle introuvable" />
      </Screen>
    );
  }

  const canReserve = room.status === 'AVAILABLE';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{room.name}</Text>
        <Badge status={room.status} />
      </View>

      <Card style={styles.card}>
        <Row label="Capacité" value={String(room.capacity)} />
        {room.location ? <Row label="Lieu" value={room.location} /> : null}
        {room.company ? <Row label="Entreprise" value={room.company.name} /> : null}
        {room.description ? <Row label="Description" value={room.description} /> : null}
      </Card>

      {canReserve ? (
        <Button
          title="Réserver cette salle"
          onPress={() =>
            router.push(`/(app)/reservations/new?type=ROOM&roomId=${room.id}`)
          }
          accessibilityLabel="Réserver cette salle"
          style={styles.action}
        />
      ) : (
        <Text style={styles.unavailable}>
          Cette salle n’est pas réservable actuellement.
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

import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks/use-notifications';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const query = useNotifications({ page: 1, limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

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
          message="Impossible de charger les notifications."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const items = query.data?.data ?? [];
  const hasUnread = items.some((n) => !n.readAt);

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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {hasUnread ? (
              <Button
                title="Tout marquer comme lu"
                variant="ghost"
                loading={markAll.isPending}
                onPress={() => markAll.mutate()}
                accessibilityLabel="Tout marquer comme lu"
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune notification"
            description="Vous serez informé des changements sur vos réservations."
          />
        }
        renderItem={({ item }) => {
          const unread = !item.readAt;
          return (
            <Card
              style={[styles.card, unread && styles.unread]}
              onPress={() => {
                if (unread) markRead.mutate(item.id);
                if (item.entityType === 'Reservation' && item.entityId) {
                  router.push(`/(app)/reservations/${item.entityId}`);
                }
              }}
              accessibilityLabel={item.title}
            >
              <Text style={[styles.cardTitle, unread && styles.unreadTitle]}>
                {item.title}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
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
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  unreadTitle: {
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Bell,
  BellOff,
  CalendarPlus,
  CheckCheck,
  CircleCheck,
  CircleX,
  TimerReset,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import type { Notification } from '@resource-manager/types';
import {
  invalidateNotifications,
  useMarkAllNotificationsAsRead,
  useNotifications,
  usePushPermissionStatus,
} from '@/features/notifications/hooks/use-notifications';
import { handleNotificationNavigation, openNotificationSettings } from '@/lib/notifications';
import { toNotificationData } from '@/lib/notification-routing';
import { formatRelativeDateTime, groupByDay } from '@/lib/format';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/app-header';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radius, spacing } from '@/constants/theme';

type TypeVisual = { Icon: LucideIcon; color: string; background: string };

const TYPE_VISUALS: Record<string, TypeVisual> = {
  RESERVATION_CREATED: { Icon: CalendarPlus, color: colors.primary, background: colors.primaryMuted },
  RESERVATION_APPROVED: { Icon: CircleCheck, color: colors.success, background: '#DCFCE7' },
  RESERVATION_REJECTED: { Icon: CircleX, color: colors.danger, background: '#FEE2E2' },
  RESERVATION_CANCELLED: { Icon: Ban, color: colors.warning, background: '#FEF3C7' },
  RESERVATION_EXTENDED: { Icon: TimerReset, color: colors.primary, background: colors.primaryMuted },
};
const DEFAULT_VISUAL: TypeVisual = {
  Icon: Bell,
  color: colors.textMuted,
  background: colors.border,
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const query = useNotifications();
  const markAll = useMarkAllNotificationsAsRead();
  const permissionQuery = usePushPermissionStatus();

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );
  const sections = useMemo(() => groupByDay(items, (n) => n.createdAt), [items]);
  const hasUnread = items.some((n) => !n.readAt);

  const openNotification = (item: Notification) => {
    const data = toNotificationData(item);
    void handleNotificationNavigation(
      item.readAt ? { ...data, notificationId: undefined } : data,
      { onMarkedRead: () => void invalidateNotifications(queryClient) },
    );
  };

  const header = (
    <AppHeader
      title="Notifications"
      showBack
      right={
        hasUnread ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tout marquer comme lu"
            hitSlop={8}
            disabled={markAll.isPending}
            onPress={() => markAll.mutate()}
            style={({ pressed }) => [styles.readAll, pressed && styles.pressed]}
          >
            {markAll.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <CheckCheck size={18} color={colors.primary} />
            )}
            <Text style={styles.readAllText}>Tout lire</Text>
          </Pressable>
        ) : undefined
      }
      showActions={false}
    />
  );

  if (query.isLoading && !query.data) {
    return (
      <Screen padded={false} bottomInset>
        {header}
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (query.isError && items.length === 0) {
    return (
      <Screen padded={false} bottomInset>
        {header}
        <ErrorState
          message="Impossible de charger les notifications."
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const banners = (
    <View style={styles.banners}>
      {query.isError ? (
        <View style={[styles.banner, styles.bannerWarning]} accessibilityRole="alert">
          <WifiOff size={18} color={colors.warning} />
          <Text style={styles.bannerText}>
            Connexion indisponible. Affichage des dernières notifications chargées.
          </Text>
        </View>
      ) : null}
      {permissionQuery.data === 'denied' ? (
        <View style={styles.banner}>
          <BellOff size={18} color={colors.textMuted} />
          <View style={styles.bannerBody}>
            <Text style={styles.bannerText}>
              Les notifications sont désactivées. Vous pouvez les activer dans les
              paramètres de votre appareil.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openNotificationSettings}
              hitSlop={6}
            >
              <Text style={styles.bannerLink}>Ouvrir les paramètres</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {__DEV__ && permissionQuery.data === 'unavailable' ? (
        <View style={styles.banner}>
          <BellOff size={18} color={colors.textMuted} />
          <Text style={styles.bannerText}>
            Notifications push indisponibles ici (Expo Go ou projet EAS non configuré).
            Les notifications restent consultables dans cette liste.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen padded={false} bottomInset>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={banners}
        ListEmptyComponent={
          <EmptyState
            title="Aucune notification"
            description="Vous serez informé des changements sur vos réservations."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={() => openNotification(item)} />
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : null
        }
      />
    </Screen>
  );
}

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: () => void;
}) {
  const unread = !item.readAt;
  const { Icon, color, background } = TYPE_VISUALS[item.type] ?? DEFAULT_VISUAL;
  const time = formatRelativeDateTime(item.createdAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Non lue. ' : ''}${item.title}. ${item.body}. ${time}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        unread && styles.itemUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: background }]}>
        <Icon size={20} color={color} strokeWidth={2.25} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTitleRow}>
          <Text
            style={[styles.itemTitle, unread && styles.itemTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {unread ? (
            <View style={styles.unreadPill}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>Nouveau</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.itemMessage}>{item.body}</Text>
        <Text style={styles.itemTime}>{time}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  readAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
  },
  readAllText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  banners: {
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerWarning: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  bannerBody: {
    flex: 1,
    gap: spacing.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  bannerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnread: {
    backgroundColor: '#F0FAF3',
    borderColor: colors.primaryLight,
    borderLeftWidth: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  itemTitleUnread: {
    fontWeight: '800',
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  itemMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  itemTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    marginVertical: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});

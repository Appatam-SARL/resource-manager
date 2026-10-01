import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { colors } from '@/constants/theme';

export function HeaderActions() {
  const { user } = useAuth();
  const unreadQuery = useUnreadNotificationsCount(Boolean(user));
  const unread = unreadQuery.data ?? 0;
  const unreadLabel = unread > 99 ? '99+' : String(unread);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread > 0 ? `Notifications, ${unread} non lue(s)` : 'Notifications'
        }
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        onPress={() => router.push('/(app)/notifications')}
      >
        <Bell size={22} color={colors.text} strokeWidth={2.25} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadLabel}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mon profil"
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
        onPress={() => router.push('/(app)/profile')}
      >
        <UserAvatar
          name={user ? `${user.firstName} ${user.lastName}` : null}
          email={user?.email}
          size={42}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});

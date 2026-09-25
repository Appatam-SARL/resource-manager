import { Redirect, Tabs } from 'expo-router';
import { Calendar, Bell, Home, CalendarDays, User } from 'lucide-react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { LoadingState } from '@/components/ui/LoadingState';
import { TabBarIcon } from '@/components/layout/tab-bar-icon';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications';
import { colors } from '@/constants/theme';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const unreadQuery = useUnreadNotificationsCount(!isLoading && Boolean(user));

  if (isLoading) {
    return <LoadingState fullScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const unread = unreadQuery.data ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={Home} color={color} />,
          tabBarAccessibilityLabel: 'Accueil',
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Réservations',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={Calendar} color={color} />,
          tabBarAccessibilityLabel: 'Réservations',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendrier',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={CalendarDays} color={color} />,
          tabBarAccessibilityLabel: 'Calendrier',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color }) => <TabBarIcon Icon={Bell} color={color} />,
          tabBarAccessibilityLabel: 'Notifications',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={User} color={color} />,
          tabBarAccessibilityLabel: 'Profil',
        }}
      />
      <Tabs.Screen name="vehicles" options={{ href: null }} />
      <Tabs.Screen name="rooms" options={{ href: null }} />
      <Tabs.Screen name="403" options={{ href: null }} />
    </Tabs>
  );
}

import { Redirect, Tabs, useSegments } from 'expo-router';
import { CommonActions, type NavigationState } from 'expo-router/react-navigation';
import { Calendar, Home, CalendarDays } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth-provider';
import { LoadingState } from '@/components/ui/LoadingState';
import { TabBarIcon } from '@/components/layout/tab-bar-icon';
import { usePushNotifications } from '@/features/notifications/hooks/use-push-notifications';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';
import { colors } from '@/constants/theme';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  usePushNotifications(user?.id);
  useRealtimeSync(user?.id);
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const tabBarBottomPadding = Math.max(insets.bottom, 8);
  const tabBarStyle = {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    height: 52 + tabBarBottomPadding,
    paddingBottom: tabBarBottomPadding,
    paddingTop: 6,
  };
  const isCreatingReservation = segments.at(-1) === 'new';

  if (isLoading) {
    return <LoadingState fullScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
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
          tabBarStyle: isCreatingReservation ? { display: 'none' } : tabBarStyle,
        }}
        listeners={({ navigation, route }) => ({
          // The nested stack may keep "new" or "[id]" on top (opened from Accueil, Calendrier…):
          // the tab must always land on the reservations list.
          tabPress: (event) => {
            const tabs: NavigationState = navigation.getState();
            const stack = tabs.routes.find((tab) => tab.key === route.key)?.state;
            const topRoute = stack?.routes[stack.index ?? stack.routes.length - 1];
            if (!stack?.key || (stack.routes.length === 1 && topRoute?.name === 'index')) return;
            event.preventDefault();
            navigation.dispatch({
              ...CommonActions.reset({ index: 0, routes: [{ name: 'index' }] }),
              target: stack.key,
            });
            navigation.navigate('reservations');
          },
        })}
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
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen name="vehicles" options={{ href: null }} />
      <Tabs.Screen name="rooms" options={{ href: null }} />
      <Tabs.Screen name="403" options={{ href: null }} />
    </Tabs>
  );
}

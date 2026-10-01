import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function ReservationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Réservations', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nouvelle réservation', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Réservation', headerShown: false }} />
    </Stack>
  );
}

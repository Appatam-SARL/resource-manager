import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function VehiclesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Véhicules' }} />
      <Stack.Screen name="[id]" options={{ title: 'Détail véhicule' }} />
    </Stack>
  );
}

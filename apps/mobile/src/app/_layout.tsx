import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}

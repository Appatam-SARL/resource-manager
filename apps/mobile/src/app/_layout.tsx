import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { BrandLogo } from '@/components/brand-logo';
import { QueryProvider } from '@/providers/query-provider';
import { colors } from '@/constants/theme';

const SPLASH_BACKGROUND = '#012622';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppSplash() {
  return (
    <View style={styles.splash} accessibilityLabel="SUZANG HUB">
      <StatusBar style="light" />
      <BrandLogo size={120} />
    </View>
  );
}

function RootNavigator() {
  const { isLoading } = useAuth();

  useEffect(() => {
    // Hand off from the native splash to the branded React splash as soon as JS is ready.
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (isLoading) {
    return <AppSplash />;
  }

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BACKGROUND,
  },
});

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}

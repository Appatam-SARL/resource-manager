import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors } from '@/constants/theme';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState fullScreen />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

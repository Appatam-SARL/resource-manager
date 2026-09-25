import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type LoadingStateProps = {
  fullScreen?: boolean;
};

export function LoadingState({ fullScreen = false }: LoadingStateProps) {
  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityLabel="Chargement en cours"
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={[styles.skeleton, { height }]} />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
  },
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    opacity: 0.6,
  },
});

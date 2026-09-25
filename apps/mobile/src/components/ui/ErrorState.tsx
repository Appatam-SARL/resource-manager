import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';
import { Button } from './Button';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = 'Une erreur est survenue.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={40} color={colors.danger} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title="Réessayer"
          variant="outline"
          onPress={onRetry}
          accessibilityLabel="Réessayer le chargement"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  message: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    minWidth: 140,
  },
});

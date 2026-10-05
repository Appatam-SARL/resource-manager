import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

export default function ForbiddenScreen() {
  return (
    <Screen>
      <Text style={styles.code}>403</Text>
      <Text style={styles.title}>Accès refusé</Text>
      <Text style={styles.message}>
        Vous n’avez pas l’autorisation d’accéder à cette ressource.
      </Text>
      <Button
        title="Retour à l’accueil"
        onPress={() => router.replace('/(app)')}
        accessibilityLabel="Retour à l’accueil"
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  button: {
    alignSelf: 'flex-start',
  },
});

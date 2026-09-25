import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS, colors, spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('Erreur', 'Impossible de se déconnecter.');
    }
  };

  if (!user) return null;

  return (
    <Screen scroll>
      <Text style={styles.title}>Profil</Text>

      <Card style={styles.card}>
        <Text style={styles.name}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Entreprise</Text>
          <Text style={styles.value}>{user.company.name}</Text>
        </View>

        {user.direction ? (
          <View style={styles.row}>
            <Text style={styles.label}>Direction</Text>
            <Text style={styles.value}>{user.direction.name}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.label}>Rôle</Text>
          <Text style={styles.value}>{ROLE_LABELS[user.role]}</Text>
        </View>
      </Card>

      <Button
        title="Se déconnecter"
        variant="danger"
        onPress={() => void handleLogout()}
        accessibilityLabel="Se déconnecter"
        style={styles.logout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  logout: {
    marginTop: spacing.xl,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

export function HomeHeroSkeleton() {
  return (
    <View style={styles.hero} accessible accessibilityLabel="Chargement de votre prochaine réservation">
      <Skeleton width={150} height={12} />
      <View style={styles.row}>
        <Skeleton width={48} height={48} radius={radius.md} />
        <View style={styles.lines}>
          <Skeleton width="65%" height={18} />
          <Skeleton width="40%" height={13} />
        </View>
      </View>
      <Skeleton width="80%" height={14} />
    </View>
  );
}

export function HomeActivitySkeleton() {
  return (
    <View style={styles.list} accessible accessibilityLabel="Chargement de l’activité récente">
      {[0, 1].map((index) => (
        <View key={index} style={[styles.card, styles.row]}>
          <Skeleton width={40} height={40} radius={radius.md} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={15} />
            <Skeleton width="45%" height={12} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HomeErrorCard({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <View style={[styles.card, styles.error]} accessibilityLiveRegion="polite">
      <View style={styles.errorIcon}>
        <WifiOff size={22} color={colors.danger} />
      </View>
      <Text style={styles.errorTitle}>Impossible de charger vos réservations.</Text>
      <Text style={styles.errorText}>Vérifiez votre connexion et réessayez.</Text>
      <Button title="Réessayer" variant="outline" loading={retrying} onPress={onRetry} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lines: {
    flex: 1,
    gap: 6,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  error: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});

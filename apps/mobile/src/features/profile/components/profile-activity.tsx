import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/constants/theme';

type ProfileStatProps = {
  label: string;
  value: number;
  color?: string;
};

export function ProfileStat({ label, value, color = colors.text }: ProfileStatProps) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} : ${value}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type ProfileActivityProps = {
  total: number;
  pending: number;
  approved: number;
};

export function ProfileActivity({ total, pending, approved }: ProfileActivityProps) {
  if (total === 0) {
    return (
      <View style={styles.empty}>
        <CalendarClock size={22} color={colors.textMuted} />
        <Text style={styles.emptyText}>Votre activité apparaîtra ici.</Text>
      </View>
    );
  }

  return (
    <View style={styles.statsRow}>
      <ProfileStat label="Réservations" value={total} />
      <View style={styles.statDivider} />
      <ProfileStat label="En attente" value={pending} color={colors.warning} />
      <View style={styles.statDivider} />
      <ProfileStat label="Approuvées" value={approved} color={colors.success} />
    </View>
  );
}

export function ProfileActivitySkeleton() {
  return (
    <View
      style={styles.statsRow}
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement de l'activité"
    >
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.stat}>
          <Skeleton width={36} height={26} />
          <Skeleton width={64} height={12} />
        </View>
      ))}
    </View>
  );
}

export function ProfileActivityError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Impossible de charger votre activité.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        hitSlop={8}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  retryPressed: {
    backgroundColor: colors.background,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});

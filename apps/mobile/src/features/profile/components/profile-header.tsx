import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { colors, radius, spacing } from '@/constants/theme';

type ProfileHeaderProps = {
  fullName: string;
  email: string;
  roleLabel: string;
};

export function ProfileHeader({ fullName, email, roleLabel }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarRing}>
        <UserAvatar name={fullName} email={email} size={88} />
      </View>
      <View style={styles.identity}>
        <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
          {fullName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <View style={styles.roleBadge} accessibilityLabel={`Rôle : ${roleLabel}`}>
        <ShieldCheck size={14} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

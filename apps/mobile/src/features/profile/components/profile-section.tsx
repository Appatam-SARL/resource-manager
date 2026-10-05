import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type ProfileSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ProfileSection({ title, subtitle, children }: ProfileSectionProps) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.surface}>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View style={styles.iconTile}>
      <Icon size={18} color={colors.primary} strokeWidth={2.25} />
    </View>
  );
}

type ProfileInfoRowProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function ProfileInfoRow({ icon, label, value }: ProfileInfoRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} : ${value}`}>
      <RowIcon icon={icon} />
      <View style={styles.rowBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type ProfileMenuItemProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityHint?: string;
};

export function ProfileMenuItem({
  icon,
  title,
  description,
  trailing,
  onPress,
  accessibilityHint,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <RowIcon icon={icon} />
      <View style={styles.rowBody}>
        <Text style={styles.menuTitle}>{title}</Text>
        {description ? <Text style={styles.menuDescription}>{description}</Text> : null}
      </View>
      {trailing}
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const ICON_TILE = 36;

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  surface: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + ICON_TILE + spacing.md,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});

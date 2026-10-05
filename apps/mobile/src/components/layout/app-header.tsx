import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { HeaderActions } from '@/components/layout/header-actions';
import { colors, spacing } from '@/constants/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showActions?: boolean;
  right?: ReactNode;
};

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(app)');
  }
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  showActions = true,
  right,
}: AppHeaderProps) {
  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={goBack}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.25} />
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? (showActions ? <HeaderActions /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
